"""
Outbox worker. DATA_RAG_COMPLIANCE section 27.

    business transaction -> events row -> worker polls -> handler -> notification

Deliberately a database poll rather than Redis or a broker. The whole point of
the outbox pattern is that the event is written in the same transaction as the
change, and a database already gives that for free. Adding a broker would add an
operational dependency and a new way for an event to be lost.

Run it as a process:

    python -m app.workers.outbox            # poll forever
    python -m app.workers.outbox --once     # drain the queue and exit

An event whose type has no registered handler is marked PROCESSED with a note,
not deleted - so an unhandled type shows up in the events table rather than
vanishing. Compliance handlers are BE-2's and register themselves on import.
"""
from __future__ import annotations

import argparse
import logging
import time

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.base import utcnow
from app.models.governance import Event
from app.services import events as bus
from app.services.notify import fan_out

log = logging.getLogger("prangara.outbox")

MAX_ATTEMPTS = 5
BATCH_SIZE = 50


def process_once(limit: int = BATCH_SIZE) -> int:
    """Handle up to `limit` pending events. Returns how many were processed."""
    processed = 0
    with SessionLocal() as db:
        pending = db.scalars(
            select(Event)
            .where(Event.status.in_(("PENDING", "FAILED")), Event.attempts < MAX_ATTEMPTS)
            .order_by(Event.occurred_at)
            .limit(limit)
        ).all()

        for event in pending:
            event.attempts += 1
            handlers = bus.handlers_for(event.event_type)
            try:
                for handler in handlers:
                    handler(db, event)
                # Notification fan-out runs for every event type, so a new event
                # reaches the people watching a factory even before a domain
                # handler exists for it.
                fan_out(db, event)
                event.status = "PROCESSED"
                event.processed_at = utcnow()
                event.last_error = None if handlers else "no domain handler registered"
                processed += 1
            except Exception as ex:  # noqa: BLE001 - one bad event must not stop the queue
                db.rollback()
                # Re-read after the rollback so the attempt count still records.
                fresh = db.get(Event, event.id)
                if fresh is not None:
                    fresh.attempts += 1
                    fresh.last_error = f"{type(ex).__name__}: {ex}"[:2000]
                    fresh.status = "DEAD" if fresh.attempts >= MAX_ATTEMPTS else "FAILED"
                log.exception("event %s (%s) failed", event.id, event.event_type)
        db.commit()
    return processed


def run(poll_seconds: float = 2.0) -> None:  # pragma: no cover - long-running loop
    log.info("outbox worker started, polling every %.1fs", poll_seconds)
    while True:
        try:
            if process_once() == 0:
                time.sleep(poll_seconds)
        except KeyboardInterrupt:
            log.info("outbox worker stopping")
            return
        except Exception:  # noqa: BLE001
            log.exception("outbox loop error; backing off")
            time.sleep(poll_seconds * 5)


def main() -> None:  # pragma: no cover
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)-7s %(name)s  %(message)s")
    parser = argparse.ArgumentParser(description="PRANGARA event outbox worker")
    parser.add_argument("--once", action="store_true", help="drain the queue and exit")
    parser.add_argument("--interval", type=float, default=2.0, help="poll interval in seconds")
    args = parser.parse_args()

    if args.once:
        total = 0
        while True:
            handled = process_once()
            total += handled
            if handled == 0:
                break
        log.info("processed %d event(s)", total)
        return
    run(args.interval)


if __name__ == "__main__":  # pragma: no cover
    main()
