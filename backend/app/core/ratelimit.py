"""
Rate limiting for authentication. PRD section 28.

Scope is deliberately narrow: the endpoints where an attacker gets unlimited
free guesses. Login, register and refresh. Everything else is already behind a
token, so the cost of an attempt is a stolen session, not a guess.

Two keys per attempt, both of which must have budget:

  * **per account** — stops someone grinding one factory owner's password, even
    from a rotating pool of addresses. This is the one that actually protects a
    user, because IP rotation is cheap and passwords are not.
  * **per client address** — stops one host spraying many accounts.

In-process fixed windows, not Redis. A single API process is the deployment this
is written for, and an in-memory counter that works beats a distributed one that
needs a service nobody started. The limitation is stated rather than hidden:
behind several workers each holds its own counters, so the effective limit is
per worker. `RATE_LIMIT_ENABLED=false` turns it off for load testing.
"""
from __future__ import annotations

import os
import threading
import time
from dataclasses import dataclass


def _int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, "") or default)
    except ValueError:
        return default


ENABLED = (os.environ.get("RATE_LIMIT_ENABLED", "true").strip().lower()
           not in ("0", "false", "no", "off"))

# Generous enough that a person fumbling their password never sees it, tight
# enough that an online guessing attack is not worth running.
LOGIN_PER_ACCOUNT = _int("RATE_LIMIT_LOGIN_PER_ACCOUNT", 8)
LOGIN_PER_IP = _int("RATE_LIMIT_LOGIN_PER_IP", 30)
REGISTER_PER_IP = _int("RATE_LIMIT_REGISTER_PER_IP", 10)
REFRESH_PER_IP = _int("RATE_LIMIT_REFRESH_PER_IP", 60)
WINDOW_SECONDS = _int("RATE_LIMIT_WINDOW_SECONDS", 300)


@dataclass
class Decision:
    allowed: bool
    remaining: int
    retry_after: int


class _Windows:
    """Fixed-window counters, pruned lazily so memory cannot grow without bound."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._hits: dict[str, tuple[float, int]] = {}
        self._last_prune = time.monotonic()

    def hit(self, key: str, limit: int, window: int) -> Decision:
        now = time.monotonic()
        with self._lock:
            if now - self._last_prune > window:
                self._hits = {
                    k: v for k, v in self._hits.items() if now - v[0] < window
                }
                self._last_prune = now

            started, count = self._hits.get(key, (now, 0))
            if now - started >= window:
                started, count = now, 0

            count += 1
            self._hits[key] = (started, count)

            if count > limit:
                return Decision(False, 0, max(1, int(window - (now - started))))
            return Decision(True, limit - count, 0)

    def clear(self) -> None:
        """Test hook. Never called from request handling."""
        with self._lock:
            self._hits.clear()
            self._last_prune = time.monotonic()


_windows = _Windows()


def check(bucket: str, identifier: str, limit: int,
          window: int = WINDOW_SECONDS) -> Decision:
    if not ENABLED:
        return Decision(True, limit, 0)
    return _windows.hit(f"{bucket}:{identifier}", limit, window)


def reset() -> None:
    _windows.clear()
