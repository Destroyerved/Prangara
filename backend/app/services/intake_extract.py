"""
Extraction for conversational onboarding. PRD FR-04.

Hard boundary, from PRD section 3.1 and section 29: *the LLM does not calculate
carbon*. It reads a sentence and proposes structured values. Everything it
proposes is marked unconfirmed, validated against the schema, and shown to the
user before a single row is written.

Two extractors:

  * `llm` - a local Ollama model at near-zero temperature with a constrained
    JSON instruction. Used when OLLAMA_BASE_URL and OLLAMA_MODEL are set.
  * `rule_based` - a deterministic number-and-unit parser. Used when no LLM
    runtime is configured, which is the normal state on a demo laptop.

The rule-based path is not a stand-in pretending to be the LLM. It reports
itself as `rule_based`, and it only extracts quantities that are literally
present in the user's own sentence. It invents nothing.
"""
from __future__ import annotations

import json
import re
from typing import Any

from app.core.config import settings

# ---------------------------------------------------------------------------
# rule-based extraction
# ---------------------------------------------------------------------------

_NUMBER = r"(\d[\d,]*(?:\.\d+)?)"

# Multipliers for Indian-English magnitude words that appear constantly in this
# domain and are a common source of thousand-fold errors.
_MAGNITUDE = {
    "thousand": 1e3, "k": 1e3,
    "lakh": 1e5, "lakhs": 1e5, "lac": 1e5,
    "million": 1e6, "mn": 1e6,
    "crore": 1e7, "crores": 1e7, "cr": 1e7,
}

_PER_MONTH = re.compile(r"\b(per|a|every)\s+month\b|\bmonthly\b|/\s*month\b|pm\b", re.I)
_PER_DAY = re.compile(r"\b(per|a|every)\s+day\b|\bdaily\b|/\s*day\b", re.I)

_PATTERNS: list[tuple[str, re.Pattern[str], str]] = [
    ("electricity_kwh", re.compile(
        rf"{_NUMBER}\s*(lakh|lakhs|thousand|k|million|mn)?\s*"
        r"(?:kwh|units?|kilowatt[- ]hours?)", re.I), "kWh"),
    ("electricity_kwh", re.compile(
        rf"{_NUMBER}\s*(lakh|lakhs|thousand|k)?\s*mwh", re.I), "MWh"),
    ("annual_output_t", re.compile(
        rf"(?:produce|produces|producing|output|production)\D{{0,30}}{_NUMBER}\s*"
        r"(lakh|lakhs|thousand|k)?\s*(?:tonnes?|tons?|mt|t)\b", re.I), "tonne"),
    ("annual_revenue_cr", re.compile(
        rf"(?:turnover|revenue|sales)\D{{0,30}}(?:rs\.?|inr|₹)?\s*{_NUMBER}\s*"
        r"(crore|crores|cr|lakh|lakhs)", re.I), "crore"),
    ("employees", re.compile(
        rf"{_NUMBER}\s*(?:employees|workers|staff|people)", re.I), "count"),
    ("eu_export_share_pct", re.compile(
        rf"{_NUMBER}\s*(?:percent|%)\D{{0,25}}(?:eu|europe|european)", re.I), "%"),
    ("fuel_COAL_INDIAN", re.compile(
        rf"{_NUMBER}\s*(lakh|lakhs|thousand|k)?\s*(?:tonnes?|tons?|mt|t)\s*(?:of\s*)?coal", re.I),
     "tonne"),
    ("fuel_DIESEL", re.compile(
        rf"{_NUMBER}\s*(lakh|lakhs|thousand|k)?\s*(?:litres?|liters?|l|kl)\s*(?:of\s*)?diesel", re.I),
     "litre"),
    ("fuel_NATURAL_GAS", re.compile(
        rf"{_NUMBER}\s*(lakh|lakhs|thousand|k)?\s*(?:sm3|scm|m3|cubic\s*met(?:re|er)s?)\s*"
        r"(?:of\s*)?(?:natural\s*)?gas", re.I), "Sm3"),
    ("fuel_BIOMASS_BRIQUETTE", re.compile(
        rf"{_NUMBER}\s*(lakh|lakhs|thousand|k)?\s*(?:tonnes?|tons?|t)\s*(?:of\s*)?"
        r"(?:biomass|briquettes?)", re.I), "tonne"),
    ("tariff_inr_per_kwh", re.compile(
        rf"(?:rs\.?|inr|₹)\s*{_NUMBER}\s*(?:per|/)\s*(?:kwh|unit)", re.I), "INR/kWh"),
]

# Fields the engine cannot produce a meaningful answer without.
_CRITICAL_FIELDS = ("sector", "annual_output_t", "electricity_kwh")

_QUESTIONS = {
    "sector": "Which sector best describes this plant?",
    "annual_output_t": "Roughly how much product do you make in a year, and in what unit?",
    "annual_revenue_cr": "What is your approximate annual turnover in crore?",
    "electricity_kwh": "About how many electricity units (kWh) do you use in a year?",
    "fuels": "Do you burn any fuel for process heat - coal, briquettes, gas, furnace oil? Roughly how much a year?",
    "materials": "What are your main purchased raw materials, and roughly how many tonnes a year?",
    "waste": "Roughly how much waste do you send out a year, and where does it go?",
    "freight": "Roughly how far and how much do you move in and out by road each year?",
    "state": "Which state is the plant in? The grid factor varies a lot between states.",
}


def _to_float(raw: str, magnitude: str | None) -> float:
    value = float(raw.replace(",", ""))
    if magnitude:
        value *= _MAGNITUDE.get(magnitude.lower(), 1.0)
    return value


def extract_rule_based(message: str, known: dict[str, Any] | None = None) -> dict[str, Any]:
    """Pull quantities that are literally present in the message."""
    known = known or {}
    fields: list[dict[str, Any]] = []
    warnings: list[str] = []
    seen: set[str] = set()

    monthly = bool(_PER_MONTH.search(message))
    daily = bool(_PER_DAY.search(message))

    for field, pattern, unit in _PATTERNS:
        match = pattern.search(message)
        if not match or field in seen:
            continue
        groups = match.groups()
        magnitude = groups[1] if len(groups) > 1 else None
        try:
            value = _to_float(groups[0], magnitude)
        except ValueError:
            continue

        # Annualise, and say so. A plant that reports a monthly bill and gets it
        # treated as annual is out by 12x, which is the single most damaging
        # arithmetic error in this whole intake path.
        annualised_note = None
        if field != "tariff_inr_per_kwh" and field != "eu_export_share_pct":
            if monthly:
                value *= 12
                annualised_note = "stated per month, annualised by x12"
            elif daily:
                value *= 365
                annualised_note = "stated per day, annualised by x365"

        if field == "electricity_kwh" and unit == "MWh":
            value *= 1000.0
            unit = "kWh"

        fields.append({
            "field": field,
            "value": round(value, 4),
            "unit": unit,
            # Rule-based extraction is a literal read of the sentence, so it is
            # reliable about *what was written* and says nothing about whether
            # the user meant it. Confidence reflects that, not certainty.
            "confidence": 0.6 if annualised_note else 0.75,
            "evidence_text": match.group(0).strip(),
            "needs_confirmation": True,
        })
        seen.add(field)
        if annualised_note:
            warnings.append(f"{field}: {annualised_note}. Confirm the period.")

    if monthly and daily:
        warnings.append(
            "The message mentions both daily and monthly figures. Check each annualised value."
        )

    merged = {**known, **{f["field"]: f["value"] for f in fields}}
    missing = [f for f in _CRITICAL_FIELDS if not merged.get(f)]
    if not any(f["field"].startswith("fuel_") for f in fields) and not known.get("fuels"):
        missing.append("fuels")
    if not merged.get("materials"):
        missing.append("materials")

    return {
        "extractor": "rule_based",
        "extractor_detail": (
            "Deterministic number-and-unit parser. No language model is configured, so only "
            "quantities written explicitly in your message were read. Nothing was inferred."
        ),
        "fields": fields,
        "missing_fields": missing,
        "follow_up_questions": [_QUESTIONS[m] for m in missing if m in _QUESTIONS],
        "warnings": warnings,
    }


# ---------------------------------------------------------------------------
# LLM extraction
# ---------------------------------------------------------------------------

_SYSTEM = """You extract structured factory data from a plain-language description.

Rules you must not break:
- Only report values the user actually stated. Never estimate, infer or fill gaps.
- Never calculate emissions, carbon, cost or savings. That is not your job.
- Report the unit exactly as the user gave it.
- If a figure is stated per month or per day, report it as given and set "period"
  to "month" or "day". Do not annualise.
- If you are unsure, leave the field out.

Return ONLY a JSON object of this shape, with no prose:
{"fields": [{"field": "<name>", "value": <number>, "unit": "<unit>",
             "period": "year|month|day", "confidence": <0..1>,
             "evidence_text": "<the words you read it from>"}]}

Valid field names: sector, state, annual_output_t, annual_revenue_cr, employees,
electricity_kwh, tariff_inr_per_kwh, eu_export_share_pct,
fuel_COAL_INDIAN, fuel_DIESEL, fuel_NATURAL_GAS, fuel_LPG, fuel_FURNACE_OIL,
fuel_BIOMASS_BRIQUETTE, material_<KEY>, waste_<KEY>, freight_<KEY>.
"""

_PERIOD_MULTIPLIER = {"year": 1.0, "month": 12.0, "day": 365.0}


def extract_with_llm(message: str, known: dict[str, Any] | None = None,
                     timeout: float = 25.0) -> dict[str, Any] | None:
    """Call the configured Ollama model. Returns None if it is unusable.

    Returning None rather than raising is deliberate: a failed model call must
    degrade to the deterministic parser, not break onboarding.
    """
    if not (settings.ollama_base_url and settings.ollama_model):
        return None
    try:
        import httpx
    except ImportError:
        return None

    try:
        response = httpx.post(
            f"{settings.ollama_base_url.rstrip('/')}/api/chat",
            json={
                "model": settings.ollama_model,
                "stream": False,
                "format": "json",
                "options": {"temperature": 0.0},
                "messages": [
                    {"role": "system", "content": _SYSTEM},
                    {"role": "user", "content": message},
                ],
            },
            timeout=timeout,
        )
        response.raise_for_status()
        content = response.json().get("message", {}).get("content", "")
        parsed = json.loads(content)
    except Exception:
        return None

    fields: list[dict[str, Any]] = []
    warnings: list[str] = []
    for item in parsed.get("fields", []) or []:
        name = str(item.get("field", "")).strip()
        if not name:
            continue
        raw_value = item.get("value")
        if isinstance(raw_value, str):
            try:
                raw_value = float(raw_value.replace(",", ""))
            except ValueError:
                continue
        if not isinstance(raw_value, (int, float)):
            continue

        # Annualisation happens here, in code, not in the model. A model that is
        # asked to multiply is a model that will sometimes multiply wrongly.
        period = str(item.get("period", "year")).lower()
        multiplier = _PERIOD_MULTIPLIER.get(period, 1.0)
        value = float(raw_value) * multiplier
        if multiplier != 1.0:
            warnings.append(f"{name}: stated per {period}, annualised by x{multiplier:g}.")

        confidence = item.get("confidence", 0.5)
        try:
            confidence = min(1.0, max(0.0, float(confidence)))
        except (TypeError, ValueError):
            confidence = 0.5

        fields.append({
            "field": name,
            "value": value,
            "unit": item.get("unit"),
            "confidence": confidence,
            "evidence_text": item.get("evidence_text"),
            "needs_confirmation": True,
        })

    merged = {**(known or {}), **{f["field"]: f["value"] for f in fields}}
    missing = [f for f in _CRITICAL_FIELDS if not merged.get(f)]
    return {
        "extractor": "llm",
        "extractor_detail": (
            f"Local model {settings.ollama_model} at temperature 0 with constrained JSON output. "
            "The model proposes values only; it does not calculate anything."
        ),
        "fields": fields,
        "missing_fields": missing,
        "follow_up_questions": [_QUESTIONS[m] for m in missing if m in _QUESTIONS],
        "warnings": warnings,
    }


def extract(message: str, known: dict[str, Any] | None = None) -> dict[str, Any]:
    """LLM when configured and working, deterministic parser otherwise."""
    return extract_with_llm(message, known) or extract_rule_based(message, known)
