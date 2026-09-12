"""
Rule-based conversational extraction.

The bug these tests exist for: an earlier version detected "monthly" anywhere in
the message and applied it to every number in it, so

    "produce 4200 tonnes a year ... 340,000 units monthly"

turned 4,200 t/yr into 50,400 t/yr. A twelve-fold error on output feeds straight
into every intensity, every benchmark comparison and therefore every leak.
"""
from __future__ import annotations

import pytest

from app.services.intake_extract import extract_rule_based


def values(message: str) -> dict[str, float]:
    result = extract_rule_based(message)
    return {f["field"]: f["value"] for f in result["fields"]}


def test_period_is_read_per_clause_not_per_message() -> None:
    message = (
        "We run a foundry in Rajkot, produce 4200 tonnes a year, use about "
        "340000 units of electricity monthly and 75 tonnes of coal a month."
    )
    found = values(message)
    assert found["annual_output_t"] == 4200, "a yearly figure must not be annualised again"
    assert found["electricity_kwh"] == 340_000 * 12
    assert found["fuel_COAL_INDIAN"] == 75 * 12


def test_single_message_period_carries_to_silent_clauses() -> None:
    message = "We produce 200 tonnes a month and use 180000 units of electricity."
    found = values(message)
    assert found["annual_output_t"] == 200 * 12
    # The clause is silent, but the message names exactly one period.
    assert found["electricity_kwh"] == 180_000 * 12


def test_ambiguous_message_does_not_lend_a_period() -> None:
    message = (
        "We produce 200 tonnes a month, burn 30 tonnes of coal a day "
        "and use 180000 units of electricity."
    )
    result = extract_rule_based(message)
    found = {f["field"]: f["value"] for f in result["fields"]}
    assert found["annual_output_t"] == 200 * 12
    assert found["fuel_COAL_INDIAN"] == 30 * 365
    # Two periods are in play, so neither is borrowed. The number is taken as
    # written and the user is told it was assumed.
    assert found["electricity_kwh"] == 180_000
    assert any("no period stated" in w for w in result["warnings"])


def test_no_period_at_all_is_read_as_annual_and_flagged() -> None:
    result = extract_rule_based("We produce 4200 tonnes and use 3400000 kWh.")
    found = {f["field"]: f["value"] for f in result["fields"]}
    assert found["annual_output_t"] == 4200
    assert found["electricity_kwh"] == 3_400_000
    assert all(f["confidence"] <= 0.6 for f in result["fields"])
    assert result["warnings"]


def test_explicit_annual_wording_is_not_multiplied() -> None:
    for wording in ("per year", "a year", "annually", "per annum", "yearly"):
        found = values(f"We produce 4200 tonnes {wording}.")
        assert found["annual_output_t"] == 4200, wording


def test_rates_are_never_annualised() -> None:
    message = "We pay Rs 8.20 per kWh, 22 percent goes to the EU, and 145 employees work here, monthly billing."
    found = values(message)
    assert found["tariff_inr_per_kwh"] == pytest.approx(8.20)
    assert found["eu_export_share_pct"] == 22
    assert found["employees"] == 145


def test_indian_magnitude_words() -> None:
    assert values("We use 18 lakh units a year.")["electricity_kwh"] == 1_800_000


def test_revenue_is_reported_in_crore_not_rupees() -> None:
    """The engine reads `annual_revenue_cr` in crore.

    Returning rupees here would be out by 10^7, which changes the revenue
    intensity benchmark and the capex size band every intervention is scaled by.
    """
    assert values("Turnover is 48 crore.")["annual_revenue_cr"] == pytest.approx(48.0)
    assert values("Annual revenue about 4800 lakh.")["annual_revenue_cr"] == pytest.approx(48.0)


def test_mwh_is_converted_to_kwh() -> None:
    assert values("We use 3400 MWh a year.")["electricity_kwh"] == 3_400_000


def test_nothing_is_invented() -> None:
    result = extract_rule_based("We make metal castings in Rajkot.")
    assert result["fields"] == []
    assert result["extractor"] == "rule_based"
    assert "annual_output_t" in result["missing_fields"]
    assert result["follow_up_questions"]


def test_document_extraction_bill_and_fuel() -> None:
    from app.services.intake_extract import extract_document_content

    # 1. Electricity bill text
    elec_doc = b"Paschim Gujarat Vij Company Limited. Billed Units: 45,200 kWh. Amount: Rs 3,84,200."
    res = extract_document_content(elec_doc, "electricity_bill_aug.pdf", "electricity_bill")
    assert res["extractor"] == "ocr"
    fields = {f["field"]: f["value"] for f in res["fields"]}
    assert fields["electricity_kwh"] == 45_200.0
    assert len(res["suggested_activity_records"]) == 1
    assert res["suggested_activity_records"][0]["stream_kind"] == "electricity"
    assert res["suggested_activity_records"][0]["quantity"] == 45_200.0
    assert res["suggested_activity_records"][0]["data_state"] == "extracted_unverified"

    # 2. Fuel delivery invoice
    fuel_doc = b"Indian Oil Commercial Delivery Invoice. High Speed Diesel: 3,500 Litres. Total Rs 3,15,000."
    res_fuel = extract_document_content(fuel_doc, "diesel_invoice_120.pdf", "fuel_invoice")
    assert res_fuel["extractor"] == "ocr"
    fuel_fields = {f["field"]: f["value"] for f in res_fuel["fields"]}
    assert fuel_fields["fuel_diesel"] == 3500.0
    assert len(res_fuel["suggested_activity_records"]) == 1
    assert res_fuel["suggested_activity_records"][0]["stream_kind"] == "fuel"
    assert res_fuel["suggested_activity_records"][0]["quantity"] == 3500.0


def test_equipment_nameplate_extraction() -> None:
    from app.services.intake_extract import extract_equipment_content

    nameplate_data = b"ABB Induction Motor. Type M3BP 280. Rated Power: 75 kW. Voltage: 415 V. 50 Hz. 1485 RPM."
    res = extract_equipment_content(nameplate_data, "motor_nameplate.jpg")
    assert res["extractor"] == "ocr"
    fields = {f["field"]: f["value"] for f in res["fields"]}
    assert fields["rated_power_kw"] == 75.0
    assert fields["rated_voltage_v"] == 415

