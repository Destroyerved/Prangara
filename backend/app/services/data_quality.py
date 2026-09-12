"""
Data quality score. PRD FR-08, weights from DATA_RAG_COMPLIANCE section 31.

    Completeness       30
    Evidence coverage  25
    Freshness          15
    Measured vs est.   15
    Plausibility       10
    Extraction trust    5

The weights are taken from the specification, not chosen here, and they are
kept in one dict so BE-2 can retune them without touching the logic.

Ownership note: task.md puts data-quality scoring under BE-2. This module is the
platform-side implementation of the published weights so the assessment endpoint
can return a score today; BE-2 owns replacing or extending the components (for
example adding source-reliability once the source registry exists). The score is
not a carbon number and never feeds the engine.
"""
from __future__ import annotations

import datetime as dt
from typing import Any

from app.models.factory import (
    STATE_DOCUMENT_CONFIRMED, STATE_ESTIMATED, STATE_VERIFIED,
    ActivityRecord, FactoryProfile,
)

WEIGHTS = {
    "completeness": 30.0,
    "evidence_coverage": 25.0,
    "freshness": 15.0,
    "measured_vs_estimated": 15.0,
    "plausibility": 10.0,
    "extraction_trust": 5.0,
}

# A record older than this is stale for an annual inventory.
_FRESH_DAYS = 365
_STALE_DAYS = 550


def score_profile(profile: FactoryProfile, records: list[ActivityRecord],
                  evidence_linked_ids: set[str] | None = None) -> dict[str, Any]:
    """Return {'score', 'components', 'gaps', 'notes'}. Never raises."""
    evidence_linked_ids = evidence_linked_ids or set()
    gaps: list[str] = []
    notes: list[str] = []

    # -- completeness ------------------------------------------------------
    required = {
        "annual_output_t": bool(profile.annual_output_t) or bool(profile.annual_revenue_cr),
        "electricity": any(r.stream_kind == "electricity" and r.quantity > 0 for r in records),
        "fuel_or_electricity": any(
            r.stream_kind in ("fuel", "electricity") and r.quantity > 0 for r in records
        ),
        "materials": any(r.stream_kind == "material" and r.quantity > 0 for r in records),
        "waste": any(r.stream_kind == "waste" and r.quantity > 0 for r in records),
        "freight": any(r.stream_kind == "freight" and r.quantity > 0 for r in records),
        "tariff": profile.tariff_inr_per_kwh is not None,
    }
    for key, present in required.items():
        if not present:
            gaps.append(key)
    completeness = sum(1 for v in required.values() if v) / len(required)

    # -- evidence coverage -------------------------------------------------
    if records:
        with_evidence = sum(1 for r in records if r.id in evidence_linked_ids)
        evidence = with_evidence / len(records)
        if evidence < 0.5:
            notes.append(
                "Fewer than half the activity records have a supporting document. "
                "Upload bills to raise confidence and to satisfy disclosure evidence."
            )
    else:
        evidence = 0.0

    # -- freshness ---------------------------------------------------------
    today = dt.date.today()
    if records:
        ages = []
        for record in records:
            reference = record.period_end or record.period_start or record.created_at.date()
            ages.append((today - reference).days)
        average_age = sum(ages) / len(ages)
        if average_age <= _FRESH_DAYS:
            freshness = 1.0
        elif average_age >= _STALE_DAYS:
            freshness = 0.0
            notes.append("Activity data is more than 18 months old and should be refreshed.")
        else:
            freshness = 1.0 - (average_age - _FRESH_DAYS) / (_STALE_DAYS - _FRESH_DAYS)
    else:
        freshness = 0.0

    # -- measured vs estimated --------------------------------------------
    if records:
        strong = sum(
            1 for r in records if r.data_state in (STATE_VERIFIED, STATE_DOCUMENT_CONFIRMED)
        )
        weak = sum(1 for r in records if r.data_state == STATE_ESTIMATED)
        measured = (strong + 0.5 * (len(records) - strong - weak)) / len(records)
    else:
        measured = 0.0

    # -- plausibility ------------------------------------------------------
    # DATA_RAG_COMPLIANCE section 32. A flag is a prompt to review, never an
    # accusation, so it costs points rather than blocking the assessment.
    flags: list[str] = []
    if any(r.quantity < 0 for r in records):
        flags.append("negative_quantity")
    if profile.annual_output_t <= 0 and any(
        r.stream_kind == "material" and r.quantity > 0 for r in records
    ):
        flags.append("material_use_with_zero_output")
    if profile.eu_export_share_pct > profile.export_share_pct > 0:
        flags.append("eu_export_exceeds_total_export")
    period_flagged = [
        r.id for r in records
        if r.period_start and r.period_end and r.period_end < r.period_start
    ]
    if period_flagged:
        flags.append("invalid_period")
    plausibility = max(0.0, 1.0 - 0.34 * len(flags))
    if flags:
        notes.append("Plausibility checks flagged: " + ", ".join(flags) + ". Review before relying on this result.")

    # -- extraction trust --------------------------------------------------
    extracted = [r for r in records if r.source_kind in ("document_ocr", "conversation", "equipment_scan")]
    if extracted:
        confirmed = sum(1 for r in extracted if r.confirmed_at is not None)
        confidences = [r.extraction_confidence for r in extracted if r.extraction_confidence is not None]
        mean_confidence = sum(confidences) / len(confidences) if confidences else 0.5
        trust = 0.5 * (confirmed / len(extracted)) + 0.5 * mean_confidence
        if confirmed < len(extracted):
            notes.append(
                f"{len(extracted) - confirmed} extracted value(s) have not been confirmed by a person."
            )
    else:
        # Nothing was extracted, so there is nothing to distrust.
        trust = 1.0

    components = {
        "completeness": completeness,
        "evidence_coverage": evidence,
        "freshness": freshness,
        "measured_vs_estimated": measured,
        "plausibility": plausibility,
        "extraction_trust": trust,
    }
    score = sum(WEIGHTS[k] * v for k, v in components.items())

    return {
        "score": round(score, 1),
        "band": _band(score),
        "components": {k: {"value": round(v, 3), "weight": WEIGHTS[k],
                           "points": round(WEIGHTS[k] * v, 1)}
                       for k, v in components.items()},
        "gaps": gaps,
        "plausibility_flags": flags,
        "notes": notes,
        "weights_source": "DATA_RAG_COMPLIANCE.md section 31",
    }


def _band(score: float) -> str:
    if score >= 80:
        return "strong"
    if score >= 60:
        return "adequate"
    if score >= 40:
        return "weak"
    return "insufficient"
