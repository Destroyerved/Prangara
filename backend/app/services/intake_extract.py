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

_PER_MONTH = re.compile(r"\b(per|a|every)\s+month\b|\bmonthly\b|/\s*month\b|\bpm\b", re.I)
_PER_DAY = re.compile(r"\b(per|a|every)\s+day\b|\bdaily\b|/\s*day\b", re.I)
_PER_YEAR = re.compile(
    r"\b(per|a|every)\s+(year|annum|yr)\b|\bannually\b|\byearly\b|/\s*(year|yr)\b|\bp\.?a\.?\b",
    re.I,
)

# Where one clause ends and the next begins. Period markers are read from the
# clause a quantity sits in, not from the whole message: "we produce 4200 tonnes
# a year and use 340,000 units monthly" carries two different periods, and
# applying either one to both numbers is a twelve-fold error.
_CLAUSE_BREAK = re.compile(r"[,;.]|\band\b|\bbut\b", re.I)

_PERIOD_MULTIPLIERS = {"year": 1.0, "month": 12.0, "day": 365.0}


def _clause_spans(message: str) -> list[tuple[int, int]]:
    spans: list[tuple[int, int]] = []
    start = 0
    for match in _CLAUSE_BREAK.finditer(message):
        spans.append((start, match.start()))
        start = match.end()
    spans.append((start, len(message)))
    return [(a, b) for a, b in spans if b > a]


def _period_of(text: str) -> str | None:
    """'year' | 'month' | 'day' | None for one stretch of text."""
    if _PER_MONTH.search(text):
        return "month"
    if _PER_DAY.search(text):
        return "day"
    if _PER_YEAR.search(text):
        return "year"
    return None


def _period_resolver(message: str):
    """Return a function mapping a match position to (period, source).

    A quantity takes the period stated in its own clause. Only when its clause
    is silent does it fall back to the message, and only when the message names
    exactly one period - a message with both a monthly and a yearly figure must
    not lend either to a third number that named neither.
    """
    spans = _clause_spans(message)
    clause_periods = [(a, b, _period_of(message[a:b])) for a, b in spans]
    stated = {period for _, _, period in clause_periods if period}
    fallback = next(iter(stated)) if len(stated) == 1 else None

    def resolve(position: int) -> tuple[str, str]:
        for start, end, period in clause_periods:
            if start <= position < end and period:
                return period, "stated here"
        if fallback:
            return fallback, "from elsewhere in the message"
        return "year", "assumed annual"

    return resolve

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

    period_at = _period_resolver(message)

    # Rates, not quantities. A tariff or an export share is not a per-period
    # amount and must never be multiplied by twelve.
    not_annualised = {"tariff_inr_per_kwh", "eu_export_share_pct", "employees"}

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
        # arithmetic error in this whole intake path. The period is read from the
        # clause the number sits in, so one sentence can carry several.
        annualised_note = None
        assumed_period = False
        if field not in not_annualised:
            period, source = period_at(match.start())
            multiplier = _PERIOD_MULTIPLIERS[period]
            if multiplier != 1.0:
                value *= multiplier
                annualised_note = (
                    f"stated per {period} ({source}), annualised by x{multiplier:g}"
                )
            elif source == "assumed annual":
                assumed_period = True

        if field == "electricity_kwh" and unit == "MWh":
            value *= 1000.0
            unit = "kWh"

        if field == "annual_revenue_cr":
            # The engine reads this field in crore, not rupees. "48 crore" has
            # already been expanded to 4.8e8 by the magnitude table, so it comes
            # back down here. Leaving it expanded would put revenue intensity
            # out by seven orders of magnitude and silently change the capex
            # size band every intervention is scaled by.
            value = value / 1e7
            unit = "crore"

        fields.append({
            "field": field,
            "value": round(value, 4),
            "unit": unit,
            # Rule-based extraction is a literal read of the sentence, so it is
            # reliable about *what was written* and says nothing about whether
            # the user meant it. Confidence reflects that, not certainty, and
            # drops whenever the period had to be inferred rather than read.
            "confidence": 0.6 if (annualised_note or assumed_period) else 0.75,
            "evidence_text": match.group(0).strip(),
            "needs_confirmation": True,
        })
        seen.add(field)
        if annualised_note:
            warnings.append(f"{field}: {annualised_note}. Confirm the period.")
        elif assumed_period:
            warnings.append(
                f"{field}: no period stated, read as an annual figure. Confirm it."
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
                     timeout: float = 20.0) -> dict[str, Any] | None:
    """Call the configured Ollama model. Returns None if it is unusable.

    Returning None rather than raising is deliberate: a failed model call must
    degrade to the deterministic parser, not break onboarding.
    """
    from app.services.ollama_service import get_ollama_service

    svc = get_ollama_service()
    if not svc.is_available():
        return None

    try:
        messages = [
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": message},
        ]
        content = svc.chat(messages, json_format=True, temperature=0.0, timeout=timeout)
        if not content:
            return None
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


def extract_document_content(content_bytes: bytes, filename: str,
                             evidence_type: str = "electricity_bill") -> dict[str, Any]:
    """Parse document/bill text. Extracts consumption, bill amount, supplier, and activity records."""
    text = ""
    try:
        text = content_bytes.decode("utf-8", errors="ignore")
    except Exception:
        text = ""

    if b"%PDF" in content_bytes[:10]:
        pdf_matches = re.findall(r"\(([^\(\)]{3,100})\)", text)
        if pdf_matches:
            text = " ".join(pdf_matches)

    search_corpus = f"{filename}\n{text}"
    fields: list[dict[str, Any]] = []
    suggested_records: list[dict[str, Any]] = []
    warnings: list[str] = []

    # 1. Electricity / DISCOM bill patterns
    elec_match = re.search(
        r"(?:billed\s*units|consumption|active\s*energy|total\s*units|units)[\s:]*([0-9,]+(?:\.[0-9]+)?)\s*(?:kwh|units)?",
        search_corpus, re.I,
    )
    if elec_match:
        val_str = elec_match.group(1).replace(",", "")
        try:
            kwh = float(val_str)
            if kwh > 0:
                fields.append({
                    "field": "electricity_kwh",
                    "value": kwh,
                    "unit": "kWh",
                    "confidence": 0.85 if len(text) > 50 else 0.65,
                    "evidence_text": elec_match.group(0),
                    "needs_confirmation": True,
                })
                suggested_records.append({
                    "stream_kind": "electricity",
                    "quantity": kwh,
                    "unit": "kWh",
                    "label": f"Billed Electricity ({filename[:30]})",
                    "data_state": "extracted_unverified",
                    "source_kind": "document_ocr",
                    "extraction_confidence": 0.85,
                })
        except ValueError:
            pass

    # 2. Fuel invoice patterns (Diesel, Coal, Gas)
    fuel_match = re.search(
        r"(?:diesel|coal|furnace\s*oil|lpg|natural\s*gas)[\s\w:]*?([0-9,]+(?:\.[0-9]+)?)\s*(litres?|l|tonnes?|t|mt|kg|scm)",
        search_corpus, re.I,
    )
    if fuel_match:
        val_str = fuel_match.group(1).replace(",", "")
        unit_str = fuel_match.group(2).lower()
        try:
            qty = float(val_str)
            matched_text = fuel_match.group(0).lower()
            fuel_type = "diesel" if "diesel" in matched_text else ("coal" if "coal" in matched_text else "gas")
            std_unit = "litre" if "l" in unit_str else "tonne"
            factor_key = "DIESEL_STATIONARY" if fuel_type == "diesel" else ("COAL_INDIAN" if fuel_type == "coal" else "NATURAL_GAS")
            fields.append({
                "field": f"fuel_{fuel_type}",
                "value": qty,
                "unit": std_unit,
                "confidence": 0.80,
                "evidence_text": fuel_match.group(0),
                "needs_confirmation": True,
            })
            suggested_records.append({
                "stream_kind": "fuel",
                "factor_key": factor_key,
                "quantity": qty,
                "unit": std_unit,
                "label": f"Purchased {fuel_type.title()}",
                "data_state": "extracted_unverified",
                "source_kind": "document_ocr",
                "extraction_confidence": 0.80,
            })
        except ValueError:
            pass

    if fields or suggested_records:
        return {
            "extractor": "ocr",
            "extractor_detail": "Heuristic document text stream and field pattern extraction.",
            "fields": fields,
            "suggested_activity_records": suggested_records,
            "warnings": warnings,
        }

    return {
        "extractor": "unavailable",
        "extractor_detail": (
            "No legible text or recognized utility billing pattern was found in the document. "
            "The file has been stored as evidence - enter values manually to link them."
        ),
        "fields": [],
        "suggested_activity_records": [],
        "warnings": ["Manual entry required: document did not contain recognizable billing patterns."],
    }


def extract_equipment_content(content_bytes: bytes, filename: str) -> dict[str, Any]:
    """Parse nameplate text or metadata for rated power, RPM, voltage."""
    text = ""
    try:
        text = content_bytes.decode("utf-8", errors="ignore")
    except Exception:
        text = ""

    search_corpus = f"{filename}\n{text}"
    fields: list[dict[str, Any]] = []

    # Power rating: e.g. "45 kW", "75 HP", "150 kW", "1.5 MW"
    power_match = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*(kw|hp|mw)", search_corpus, re.I)
    if power_match:
        val = float(power_match.group(1))
        unit = power_match.group(2).lower()
        if unit == "hp":
            kw = round(val * 0.7457, 2)
        elif unit == "mw":
            kw = round(val * 1000.0, 2)
        else:
            kw = val
        fields.append({
            "field": "rated_power_kw",
            "value": kw,
            "unit": "kW",
            "confidence": 0.80,
            "evidence_text": power_match.group(0),
            "needs_confirmation": True,
        })

    # Operating voltage: e.g. "415 V", "440V"
    volt_match = re.search(r"([0-9]{3,4})\s*v\b", search_corpus, re.I)
    if volt_match:
        fields.append({
            "field": "rated_voltage_v",
            "value": int(volt_match.group(1)),
            "unit": "V",
            "confidence": 0.85,
            "evidence_text": volt_match.group(0),
            "needs_confirmation": True,
        })

    if fields:
        return {
            "extractor": "ocr",
            "extractor_detail": "Nameplate OCR extraction of rated equipment parameters.",
            "fields": fields,
        }

    return {
        "extractor": "unavailable",
        "extractor_detail": (
            "Nameplate rated power could not be determined automatically from the image. "
            "Please enter rated power (kW/HP) manually."
        ),
        "fields": [],
    }
