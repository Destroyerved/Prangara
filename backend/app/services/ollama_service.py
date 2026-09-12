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

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        response = self.chat(messages, temperature=0.0, timeout=timeout)
        if response and response.strip():
            return response.strip()
        return None


_ollama_instance: OllamaService | None = None


def get_ollama_service() -> OllamaService:
    global _ollama_instance
    if _ollama_instance is None:
        _ollama_instance = OllamaService()
    return _ollama_instance
