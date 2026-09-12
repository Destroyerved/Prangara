"""
Factor provenance.

The property these tests protect: attaching BE-2's verified sources to the
engine's factors must **change no computed number**. Every stored assessment was
produced from the engine reference registry, and a citation layer that quietly
swapped a value would change the basis of results a factory has already been
shown.

Where the two registries disagree, that is reported and flagged for review, not
resolved. Which value is right is a reference-data decision.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.services import provenance
from engine import assess, default_db, sector_db


def _active() -> tuple[dict[str, float], dict[str, str]]:
    db = default_db()
    keys = db.list_keys()
    return (
        {key: db.band(key).base for key in keys},
        {key: db.get(key)["unit"] for key in keys},
    )


def test_provenance_does_not_change_any_engine_value() -> None:
    """The load-bearing test. Citations are metadata, never inputs."""
    profile = dict(sector_db().get("foundry_casting")["demo_profile"])
    profile["sector"] = "foundry_casting"

    before = assess(profile)
    values, units = _active()
    provenance.coverage(values, units)
    for key in values:
        provenance.for_factor(key, values[key], units.get(key))
    after = assess(profile)

    assert before == after


def test_every_mapped_key_exists_in_the_engine() -> None:
    """A citation attached to a key the engine does not have is a broken link."""
    db = default_db()
    unknown = [key for key in provenance.KEY_MAP if not db.has(key)]
    assert unknown == [], f"KEY_MAP references factors the engine does not define: {unknown}"


def test_no_factor_is_cited_against_a_mismatched_unit() -> None:
    """A unit mismatch means the two registries are describing different things."""
    values, units = _active()
    mismatched = [
        key
        for key in provenance.KEY_MAP
        if provenance.for_factor(key, values.get(key), units.get(key)).get("unit_matches")
        is False
    ]
    assert mismatched == [], f"cited against a different unit: {mismatched}"


def test_known_discrepancies_are_reported_not_hidden() -> None:
    values, units = _active()
    summary = provenance.coverage(values, units)

    assert summary["datasets_present"] is True
    assert summary["with_verified_source"] >= 25
    assert summary["coverage_pct"] > 75

    flagged = {d["factor_key"] for d in summary["discrepancies"]}
    # Coal is the one that matters: it dominates Scope 1 for a foundry or a
    # dyeing plant, and the two registries are 12 percent apart.
    assert "COAL_INDIAN" in flagged

    coal = provenance.for_factor("COAL_INDIAN", values["COAL_INDIAN"], units["COAL_INDIAN"])
    assert coal["agrees"] is False
    assert coal["review_required"] is True
    assert coal["engine_value"] == values["COAL_INDIAN"]
    assert "reported rather than silently resolved" in coal["review_note"]


def test_a_verified_factor_carries_a_citable_source() -> None:
    values, units = _active()
    entry = provenance.for_factor("IN_GRID_NATIONAL", values["IN_GRID_NATIONAL"],
                                  units["IN_GRID_NATIONAL"])
    assert entry["status"] == "verified"

    source = entry["source"]
    # PRD section 3.2: publisher, document, version, date and a URL - enough for
    # someone to go and check.
    for field in ("source_id", "publisher", "title", "version", "url", "retrieved_at"):
        assert source[field], f"{field} missing from the citation"
    assert source["url"].startswith("https://")
    assert source["artefact_sha256"]
    assert entry["agrees"] is True


def test_unmapped_factors_say_so_rather_than_inventing_a_source() -> None:
    entry = provenance.for_factor("SEA_FREIGHT", 0.016, "kgCO2e/tonne-km")
    assert entry["status"] == "unmapped"
    assert "source" not in entry


def test_missing_datasets_degrade_rather_than_fail(monkeypatch) -> None:
    """`datasets/` is BE-2's and may be absent. Assessments must still run."""
    monkeypatch.setattr(provenance, "_verified", lambda: {})
    monkeypatch.setattr(provenance, "_sources", lambda: {})

    assert provenance.available() is False
    entry = provenance.for_factor("COAL_INDIAN", 1.7, "tCO2e/tonne")
    assert entry["status"] == "unavailable"

    values, units = _active()
    summary = provenance.coverage(values, units)
    assert summary["with_verified_source"] == 0
    assert summary["datasets_present"] is False

    profile = dict(sector_db().get("textile_dyeing")["demo_profile"])
    profile["sector"] = "textile_dyeing"
    assert assess(profile)["footprint"]["total_tco2e"] > 0


def test_reference_endpoints_expose_provenance(client: TestClient) -> None:
    body = client.get("/api/reference").json()
    assert body["provenance"]["with_verified_source"] >= 25

    factor = client.get("/api/reference/factors/STEEL_PRIMARY").json()
    assert factor["provenance"]["status"] == "verified"
    assert factor["provenance"]["source"]["url"]

    full = client.get("/api/reference/provenance").json()
    assert full["factors"]["IN_GRID_NATIONAL"]["source"]["publisher"]
    assert full["material_difference_threshold_pct"] == pytest.approx(5.0)
    # The endpoint states plainly that it never changes a stored result.
    assert "never change a stored result" in full["note"]
