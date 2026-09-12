"""
PRANGARA Local Ollama Runtime Integration Service.

Provides offline LLM & SLM inference for:
1. Conversational plant onboarding (structured JSON extraction at temp=0).
2. Sovereign Grounded RAG answer synthesis (strictly citation-grounded, zero hallucination).
3. Local model health inspection and capabilities discovery.

Deterministic Invariant:
The LLM only extracts and explains; it NEVER calculates emissions, Capex, Payback,
or compliance penalty figures. All math remains 100% deterministic in Python.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from app.core.config import settings

log = logging.getLogger("prangara.ollama")

DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434"
DEFAULT_OLLAMA_MODEL = "llama3:latest"


class OllamaService:
    def __init__(self, base_url: str | None = None, default_model: str | None = None) -> None:
        self.base_url = (base_url or settings.ollama_base_url or DEFAULT_OLLAMA_URL).rstrip("/")
        self.default_model = default_model or settings.ollama_model or DEFAULT_OLLAMA_MODEL
        self._cached_available: bool | None = None

    def is_available(self, timeout: float = 1.5) -> bool:
        """Fast ping to verify if the local Ollama daemon is active."""
        try:
            import httpx

            resp = httpx.get(f"{self.base_url}/api/tags", timeout=timeout)
            available = resp.status_code == 200
            self._cached_available = available
            return available
        except Exception:
            self._cached_available = False
            return False

    def list_installed_models(self, timeout: float = 2.0) -> list[dict[str, Any]]:
        """Lists all models installed on the local Ollama daemon."""
        try:
            import httpx

            resp = httpx.get(f"{self.base_url}/api/tags", timeout=timeout)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("models", [])
        except Exception as ex:
            log.debug("could not list Ollama models: %s", ex)
        return []

    def get_status(self) -> dict[str, Any]:
        """Returns runtime availability, active model, and installed models."""
        available = self.is_available()
        models = self.list_installed_models() if available else []
        model_names = [m.get("name") for m in models if m.get("name")]
        active = self.default_model if self.default_model in model_names else (model_names[0] if model_names else self.default_model)

        return {
            "available": available,
            "base_url": self.base_url,
            "active_model": active,
            "installed_models": model_names,
            "features": [
                "conversational_onboarding_extraction",
                "grounded_rag_statutory_synthesis",
            ] if available else [],
        }

    def chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        json_format: bool = False,
        temperature: float = 0.0,
        timeout: float = 15.0,
    ) -> str | None:
        """Executes non-streaming chat with local Ollama model."""
        target_model = model or self.default_model
        try:
            import httpx

            payload: dict[str, Any] = {
                "model": target_model,
                "messages": messages,
                "stream": False,
                "options": {"temperature": temperature},
            }
            if json_format:
                payload["format"] = "json"

            resp = httpx.post(f"{self.base_url}/api/chat", json=payload, timeout=timeout)
            if resp.status_code == 200:
                body = resp.json()
                return body.get("message", {}).get("content", "")
            log.warning("Ollama chat failed with HTTP %d: %s", resp.status_code, resp.text)
        except Exception as ex:
            log.warning("Ollama chat error on %s: %s", target_model, ex)
        return None

    def synthesize_rag_answer(
        self,
        question: str,
        citations_context: list[dict[str, Any]],
        *,
        timeout: float = 12.0,
    ) -> str | None:
        """Synthesizes a grounded, concise answer based ONLY on verified statutory knowledge chunks.

        Enforces strict zero-hallucination constraints. Returns None if Ollama is unavailable
        or fails, allowing the caller to fall back to verbatim citation extraction.
        """
        if not citations_context or not self.is_available():
            return None

        context_blocks = []
        for idx, c in enumerate(citations_context, 1):
            title = c.get("document_title") or c.get("title") or "Statutory Source"
            section = c.get("section") or ""
            text = c.get("text_content") or ""
            context_blocks.append(f"[{idx}] Source: {title} | Section: {section}\nExcerpt: {text}")

        context_str = "\n\n".join(context_blocks)
        system_prompt = (
            "You are PRANGARA Sovereign Industrial Carbon & Regulatory Intelligence Assistant.\n"
            "Answer the user's question accurately and concisely using ONLY the provided verified regulatory excerpts.\n\n"
            "MANDATORY INVARIANTS:\n"
            "1. Base your answer strictly on the provided excerpts.\n"
            "2. State the statutory document and section explicitly.\n"
            "3. Do NOT make up facts, numbers, or assumptions.\n"
            "4. If the provided excerpts do not directly contain the answer, reply EXACTLY:\n"
            "   \"I cannot support that answer from the currently approved source set.\"\n"
            "5. Keep the response factual, objective, and under 3 sentences."
        )

        user_prompt = f"VERIFIED STATUTORY EXCERPTS:\n{context_str}\n\nUSER QUESTION: {question}"

    def is_vision_available(self) -> bool:
        """Checks if a vision-capable multimodal model is available in Ollama."""
        models = self.list_installed_models()
        vision_names = [m.get("name", "") for m in models]
        for name in vision_names:
            lower = name.lower()
            if any(k in lower for k in ("gemma", "vision", "llava", "moondream", "vl", "bakllava")):
                return True
        return False

    def get_vision_model(self) -> str:
        """Returns the configured or first discovered vision-capable model."""
        if settings.ollama_vision_model:
            return settings.ollama_vision_model
        models = self.list_installed_models()
        for m in models:
            name = m.get("name", "")
            lower = name.lower()
            if any(k in lower for k in ("gemma", "vision", "llava", "moondream", "vl", "bakllava")):
                return name
        return "gemma4:latest"

    def analyze_image(
        self,
        image_bytes: bytes,
        prompt: str,
        *,
        system_prompt: str | None = None,
        model: str | None = None,
        timeout: float = 25.0,
    ) -> str | None:
        """Passes an image to a local Vision Language Model (VLM) for multimodal visual analysis."""
        if not image_bytes or not self.is_available():
            return None

        import base64
        b64_image = base64.b64encode(image_bytes).decode("utf-8")
        target_model = model or self.get_vision_model()

        try:
            import httpx

            payload: dict[str, Any] = {
                "model": target_model,
                "prompt": prompt,
                "images": [b64_image],
                "stream": False,
                "options": {"temperature": 0.0},
            }
            if system_prompt:
                payload["system"] = system_prompt

            resp = httpx.post(f"{self.base_url}/api/generate", json=payload, timeout=timeout)
            if resp.status_code == 200:
                body = resp.json()
                return body.get("response", "")
            log.warning("Ollama VLM generate failed with HTTP %d: %s", resp.status_code, resp.text)
        except Exception as ex:
            log.warning("Ollama VLM error on %s: %s", target_model, ex)
        return None

    def extract_equipment_from_image(self, image_bytes: bytes, filename: str) -> dict[str, Any] | None:
        """Uses local VLM to inspect equipment nameplate photos (motor, compressor, boiler, pump)."""
        prompt = (
            "Analyze this industrial equipment nameplate image.\n"
            "Extract the following technical parameters:\n"
            "- Rated power (kW or HP)\n"
            "- Rated voltage (V)\n"
            "- Rated speed / RPM\n"
            "- Efficiency class (e.g. IE2, IE3, IE4)\n"
            "- Equipment type (e.g. induction motor, screw compressor, centrifugal pump)\n"
            "- Manufacturer / Brand name\n\n"
            "Output JSON format:\n"
            "{\n"
            '  "rated_power_kw": <number or null>,\n'
            '  "rated_voltage_v": <number or null>,\n'
            '  "rpm": <number or null>,\n'
            '  "efficiency_class": <string or null>,\n'
            '  "equipment_type": <string or null>,\n'
            '  "manufacturer": <string or null>\n'
            "}"
        )
        response = self.analyze_image(
            image_bytes,
            prompt,
            system_prompt="You are an industrial equipment engineer. Extract exact nameplate specifications. Return JSON only.",
        )
        if not response:
            return None

        try:
            import re
            json_match = re.search(r"\{.*\}", response, re.DOTALL)
            if not json_match:
                return None
            data = json.loads(json_match.group(0))

            fields: list[dict[str, Any]] = []
            if data.get("rated_power_kw") is not None:
                fields.append({
                    "field": "rated_power_kw",
                    "value": float(data["rated_power_kw"]),
                    "unit": "kW",
                    "confidence": 0.90,
                    "evidence_text": f"VLM visual nameplate readout: {data.get('rated_power_kw')} kW",
                    "needs_confirmation": True,
                })
            if data.get("rated_voltage_v") is not None:
                fields.append({
                    "field": "rated_voltage_v",
                    "value": int(data["rated_voltage_v"]),
                    "unit": "V",
                    "confidence": 0.90,
                    "evidence_text": f"VLM visual readout: {data.get('rated_voltage_v')} V",
                    "needs_confirmation": True,
                })
            if data.get("rpm") is not None:
                fields.append({
                    "field": "rated_rpm",
                    "value": int(data["rpm"]),
                    "unit": "RPM",
                    "confidence": 0.85,
                    "evidence_text": f"VLM visual readout: {data.get('rpm')} RPM",
                    "needs_confirmation": True,
                })
            if data.get("efficiency_class"):
                fields.append({
                    "field": "efficiency_class",
                    "value": str(data["efficiency_class"]),
                    "unit": None,
                    "confidence": 0.85,
                    "evidence_text": f"VLM visual readout: {data.get('efficiency_class')}",
                    "needs_confirmation": True,
                })
            if data.get("equipment_type"):
                fields.append({
                    "field": "equipment_type",
                    "value": str(data["equipment_type"]),
                    "unit": None,
                    "confidence": 0.85,
                    "evidence_text": f"VLM visual readout: {data.get('equipment_type')}",
                    "needs_confirmation": True,
                })
            if data.get("manufacturer"):
                fields.append({
                    "field": "manufacturer",
                    "value": str(data["manufacturer"]),
                    "unit": None,
                    "confidence": 0.85,
                    "evidence_text": f"VLM visual readout: {data.get('manufacturer')}",
                    "needs_confirmation": True,
                })

            if fields:
                return {
                    "extractor": "vlm",
                    "extractor_detail": f"Local VLM visual nameplate inspection ({self.get_vision_model()}).",
                    "fields": fields,
                }
        except Exception as ex:
            log.debug("failed to parse VLM nameplate output: %s", ex)
        return None

    def extract_document_from_image(
        self,
        image_bytes: bytes,
        filename: str,
        evidence_type: str = "electricity_bill",
    ) -> dict[str, Any] | None:
        """Uses local VLM to inspect utility bills or invoice photos (electricity, gas, fuel)."""
        prompt = (
            f"Analyze this industrial {evidence_type.replace('_', ' ')} image.\n"
            "Extract the following values:\n"
            "- Total billed consumption quantity (kWh for electricity, litres or tonnes for fuel)\n"
            "- Unit of measurement (kWh, tonne, litre)\n"
            "- Total billed amount in INR\n"
            "- Tariff rate per unit in INR\n"
            "- Period start date (YYYY-MM-DD)\n"
            "- Period end date (YYYY-MM-DD)\n\n"
            "Output JSON format:\n"
            "{\n"
            '  "quantity": <number or null>,\n'
            '  "unit": <string or null>,\n'
            '  "cost_inr": <number or null>,\n'
            '  "tariff_rate": <number or null>,\n'
            '  "period_start": <string YYYY-MM-DD or null>,\n'
            '  "period_end": <string YYYY-MM-DD or null>\n'
            "}"
        )
        response = self.analyze_image(
            image_bytes,
            prompt,
            system_prompt="You are an industrial energy auditor. Extract exact utility bill quantities. Return JSON only.",
        )
        if not response:
            return None

        try:
            import re
            json_match = re.search(r"\{.*\}", response, re.DOTALL)
            if not json_match:
                return None
            data = json.loads(json_match.group(0))

            fields: list[dict[str, Any]] = []
            suggested: list[dict[str, Any]] = []
            qty = data.get("quantity")
            if qty is not None:
                qty_val = float(qty)
                unit_val = data.get("unit") or ("kWh" if "elec" in evidence_type else "tonne")
                stream_kind = "electricity" if "elec" in evidence_type else "fuel"
                factor_key = "IN_GRID_NATIONAL" if stream_kind == "electricity" else "DIESEL_STATIONARY"
                fields.append({
                    "field": f"{stream_kind}_kwh" if stream_kind == "electricity" else "fuel_consumption",
                    "value": qty_val,
                    "unit": unit_val,
                    "confidence": 0.88,
                    "evidence_text": f"VLM visual bill extraction: {qty_val} {unit_val}",
                    "needs_confirmation": True,
                })
                suggested.append({
                    "stream_kind": stream_kind,
                    "factor_key": factor_key,
                    "quantity": qty_val,
                    "unit": unit_val,
                    "label": f"VLM Extracted {evidence_type.replace('_', ' ').title()}",
                    "data_state": "extracted_unverified",
                    "source_kind": "document_ocr",
                    "extraction_confidence": 0.88,
                })

            if data.get("tariff_rate") is not None:
                fields.append({
                    "field": "tariff_inr_per_kwh",
                    "value": float(data["tariff_rate"]),
                    "unit": "INR/kWh",
                    "confidence": 0.85,
                    "evidence_text": f"VLM visual tariff readout: ₹{data.get('tariff_rate')}/unit",
                    "needs_confirmation": True,
                })

            if fields:
                return {
                    "extractor": "vlm",
                    "extractor_detail": f"Local VLM visual document inspection ({self.get_vision_model()}).",
                    "fields": fields,
                    "suggested_activity_records": suggested,
                    "warnings": [],
                }
        except Exception as ex:
            log.debug("failed to parse VLM document output: %s", ex)
        return None


def is_image(content_bytes: bytes) -> bool:
    """Detects if raw bytes are an image file (PNG, JPEG, WEBP, GIF, BMP, TIFF)."""
    if not content_bytes or len(content_bytes) < 4:
        return False
    return (
        content_bytes.startswith(b"\x89PNG")
        or content_bytes.startswith(b"\xff\xd8")
        or (len(content_bytes) > 12 and content_bytes[:4] == b"RIFF" and content_bytes[8:12] == b"WEBP")
        or content_bytes.startswith(b"GIF8")
        or content_bytes.startswith(b"BM")
        or content_bytes.startswith(b"II*\x00")
        or content_bytes.startswith(b"MM\x00*")
    )


_ollama_instance: OllamaService | None = None


def get_ollama_service() -> OllamaService:
    global _ollama_instance
    if _ollama_instance is None:
        _ollama_instance = OllamaService()
    return _ollama_instance

