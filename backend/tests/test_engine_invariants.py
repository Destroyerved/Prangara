"""
The non-negotiable engine tests from task.md section 15.

These assert properties of the deterministic engine, not of the platform. If one
of them fails, a number somewhere in the product is wrong, and no amount of
working API surface makes up for it.
"""
from __future__ import annotations

import pytest

from engine import assess, sector_db, version_stamp

SECTORS = sorted(sector_db().sectors)


def demo_profile(sector_key: str) -> dict:
    profile = dict(sector_db().get(sector_key)["demo_profile"])
    profile["sector"] = sector_key
    profile.setdefault("eu_export_share_pct", 20)
    return profile


@pytest.mark.parametrize("sector_key", SECTORS)
def test_stream_sum_equals_scope_totals(sector_key: str) -> None:
    result = assess(demo_profile(sector_key))
    footprint = result["footprint"]
    for scope in (1, 2, 3):
        streams = sum(s["tco2e"] for s in footprint["streams"] if s["scope"] == scope)
        assert streams == pytest.approx(footprint[f"scope{scope}_tco2e"], abs=0.05), (
            f"scope {scope} streams do not sum to the scope total in {sector_key}"
        )


@pytest.mark.parametrize("sector_key", SECTORS)
def test_scope_sum_equals_total(sector_key: str) -> None:
    footprint = assess(demo_profile(sector_key))["footprint"]
    total = footprint["scope1_tco2e"] + footprint["scope2_tco2e"] + footprint["scope3_tco2e"]
    assert total == pytest.approx(footprint["total_tco2e"], abs=0.05)


@pytest.mark.parametrize("sector_key", SECTORS)
def test_uncertainty_band_is_ordered(sector_key: str) -> None:
    result = assess(demo_profile(sector_key))
    band = result["footprint"]["total_range"]
    assert band["low"] <= band["base"] <= band["high"]
    for stream in result["footprint"]["streams"]:
        r = stream["range"]
        assert r["low"] <= r["base"] <= r["high"], stream["key"]


@pytest.mark.parametrize("sector_key", SECTORS)
def test_no_intervention_abates_more_than_its_target_stream(sector_key: str) -> None:
    result = assess(demo_profile(sector_key))
    for rec in result["recommendations"]["recommendations"]:
        assert rec["abatement_tco2e"] <= rec["target_stream_tco2e"] + 0.01, rec["id"]


@pytest.mark.parametrize("sector_key", SECTORS)
def test_derated_never_exceeds_standalone(sector_key: str) -> None:
    for rec in assess(demo_profile(sector_key))["recommendations"]["recommendations"]:
        assert rec["portfolio_abatement_tco2e"] <= rec["abatement_tco2e"] + 0.01, rec["id"]


@pytest.mark.parametrize("sector_key", SECTORS)
def test_portfolio_abatement_cannot_exceed_footprint(sector_key: str) -> None:
    result = assess(demo_profile(sector_key))
    assert result["recommendations"]["total_abatement_available_tco2e"] <= \
        result["footprint"]["total_tco2e"] + 0.01


@pytest.mark.parametrize("sector_key", SECTORS)
def test_payback_handles_zero_and_negative_benefit(sector_key: str) -> None:
    for rec in assess(demo_profile(sector_key))["recommendations"]["recommendations"]:
        if rec["net_annual_benefit_inr"] <= 0:
            assert rec["payback_yrs"] is None, (
                f"{rec['id']} reports a payback on a non-positive benefit"
            )
        else:
            assert rec["payback_yrs"] is not None and rec["payback_yrs"] >= 0


def test_fuel_switch_can_be_net_cost() -> None:
    """An honest engine must be able to say an intervention costs money.

    Biomass switching frequently increases the fuel bill in India. A library
    where every recommendation saves cash is a library that has been tuned to
    look good rather than to be right.
    """
    seen_positive_lcoa = False
    for sector_key in SECTORS:
        for rec in assess(demo_profile(sector_key))["recommendations"]["recommendations"]:
            if rec["lcoa_inr_per_tco2e"] > 0:
                seen_positive_lcoa = True
    assert seen_positive_lcoa, "no intervention anywhere has a positive cost of abatement"


def test_blocked_stays_blocked() -> None:
    """A sector block must suppress the intervention, not merely flag it."""
    result = assess(demo_profile("pharma_formulation"))
    blocked_ids = {b["id"] for b in result["recommendations"]["blocked"]}
    assert "RPET_SUB" in blocked_ids
    recommended = {r["id"] for r in result["recommendations"]["recommendations"]}
    assert blocked_ids.isdisjoint(recommended)


def test_substitution_respects_cap() -> None:
    result = assess(demo_profile("food_processing"))
    capped = [r for r in result["recommendations"]["recommendations"]
              if r["id"] == "RPET_SUB"]
    if capped:
        assert capped[0]["substitution_capped"] or capped[0]["restriction_note"]


def test_unknown_units_fail_loudly() -> None:
    from app.core.errors import UnprocessableEntity
    from app.services.units import convert

    assert convert(5, "MWh", "kWh") == 5000
    with pytest.raises(UnprocessableEntity):
        convert(5, "tonne", "litre")
    with pytest.raises(UnprocessableEntity):
        convert(5, "", "kWh")


@pytest.mark.parametrize("sector_key", SECTORS)
def test_same_input_same_versions_same_output(sector_key: str) -> None:
    profile = demo_profile(sector_key)
    first, second = assess(profile), assess(profile)
    assert first == second
    assert version_stamp()["engine_version"]


def test_sector_is_required() -> None:
    with pytest.raises(ValueError):
        assess({"electricity_kwh": 1000})


# ---------------------------------------------------------------------------
# Contract fields the web dashboard consumes.
#
# These are additive output fields, not calculations. They are pinned here
# because a client was already built against them: removing one silently breaks
# a page in another repository, which is the failure the shared contract exists
# to prevent.
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("sector_key", SECTORS)
def test_every_stream_cites_the_factors_that_priced_it(sector_key: str) -> None:
    """PRD section 3.2 - a number must point at the factor behind it.

    A list rather than a single key: process heat is a fuel mix and freight is a
    modal mix, so naming one factor for a blended stream would be a false
    citation.
    """
    from engine import default_db

    db = default_db()
    for stream in assess(demo_profile(sector_key))["footprint"]["streams"]:
        keys = stream["factor_keys"]
        assert keys, f"{stream['key']} cites no factor"
        for key in keys:
            assert db.has(key), f"{stream['key']} cites unknown factor {key}"


@pytest.mark.parametrize("sector_key", SECTORS)
def test_benchmarked_leaks_report_all_three_quartiles(sector_key: str) -> None:
    for leak in assess(demo_profile(sector_key))["leaks"]["leaks"]:
        if leak["rule"] == "structural_hotspot":
            # No applicable benchmark, so percentiles are genuinely absent.
            assert leak["p25"] is None and leak["p50"] is None
            continue
        assert leak["p25"] is not None, f"{leak['stream_key']} has no p25"
        assert leak["p25"] <= leak["p50"] <= leak["p75"], "quartiles out of order"


@pytest.mark.parametrize("sector_key", SECTORS)
def test_a_capped_recommendation_states_its_ceiling(sector_key: str) -> None:
    """"Capped" without the cap tells the user nothing they can act on."""
    for rec in assess(demo_profile(sector_key))["recommendations"]["recommendations"]:
        if rec["substitution_capped"]:
            assert rec["substitution_cap_pct"] is not None, rec["id"]
            assert 0 < rec["substitution_cap_pct"] <= 100
