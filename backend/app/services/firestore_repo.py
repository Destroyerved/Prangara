"""
Google Cloud Firestore repository for PRANGARA domain documents.
Handles serialization, storage, and querying for:
- Organizations
- Users
- Factories (plant profiles)
- Assessments (emissions, MACC, leaks, compliance snapshots)
- Evidence Vault (utility bills, weighbridge slips)
- Scenarios (what-if profiles)
"""
from __future__ import annotations

import datetime as dt
import logging
from typing import Any

from app.core.firestore_db import get_firestore_client, is_firestore_enabled

logger = logging.getLogger("prangara.firestore_repo")


class FirestoreRepository:
    def __init__(self) -> None:
        self.client = get_firestore_client()

    @property
    def is_active(self) -> bool:
        return self.client is not None

    # --- Organizations ---
    def save_organization(self, org_id: str, data: dict[str, Any]) -> dict[str, Any]:
        doc_ref = self.client.collection("organizations").document(org_id)
        payload = {**data, "id": org_id, "updated_at": dt.datetime.now(dt.timezone.utc)}
        doc_ref.set(payload, merge=True)
        return payload

    def get_organization(self, org_id: str) -> dict[str, Any] | None:
        doc = self.client.collection("organizations").document(org_id).get()
        return doc.to_dict() if doc.exists else None

    # --- Users ---
    def save_user(self, user_id: str, data: dict[str, Any]) -> dict[str, Any]:
        doc_ref = self.client.collection("users").document(user_id)
        payload = {**data, "id": user_id, "updated_at": dt.datetime.now(dt.timezone.utc)}
        doc_ref.set(payload, merge=True)
        return payload

    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        users = (
            self.client.collection("users")
            .where("email", "==", email.strip().lower())
            .limit(1)
            .stream()
        )
        for u in users:
            return u.to_dict()
        return None

    # --- Factories ---
    def save_factory(self, factory_id: str, data: dict[str, Any]) -> dict[str, Any]:
        doc_ref = self.client.collection("factories").document(factory_id)
        payload = {**data, "id": factory_id, "updated_at": dt.datetime.now(dt.timezone.utc)}
        doc_ref.set(payload, merge=True)
        return payload

    def get_factory(self, factory_id: str) -> dict[str, Any] | None:
        doc = self.client.collection("factories").document(factory_id).get()
        return doc.to_dict() if doc.exists else None

    def list_factories_by_org(self, org_id: str) -> list[dict[str, Any]]:
        docs = self.client.collection("factories").where("organization_id", "==", org_id).stream()
        return [d.to_dict() for d in docs]

    # --- Assessments ---
    def save_assessment(self, assessment_id: str, data: dict[str, Any]) -> dict[str, Any]:
        doc_ref = self.client.collection("assessments").document(assessment_id)
        payload = {
            **data,
            "id": assessment_id,
            "created_at": data.get("created_at") or dt.datetime.now(dt.timezone.utc),
        }
        doc_ref.set(payload, merge=True)
        return payload

    def get_assessment(self, assessment_id: str) -> dict[str, Any] | None:
        doc = self.client.collection("assessments").document(assessment_id).get()
        return doc.to_dict() if doc.exists else None

    def list_assessments_by_factory(self, factory_id: str, limit: int = 50) -> list[dict[str, Any]]:
        docs = (
            self.client.collection("assessments")
            .where("factory_id", "==", factory_id)
            .order_by("created_at", direction="DESCENDING")
            .limit(limit)
            .stream()
        )
        return [d.to_dict() for d in docs]

    # --- Evidence Vault ---
    def save_evidence(self, evidence_id: str, data: dict[str, Any]) -> dict[str, Any]:
        doc_ref = self.client.collection("evidence_vault").document(evidence_id)
        payload = {**data, "id": evidence_id, "created_at": dt.datetime.now(dt.timezone.utc)}
        doc_ref.set(payload, merge=True)
        return payload

    def list_evidence_by_factory(self, factory_id: str) -> list[dict[str, Any]]:
        docs = self.client.collection("evidence_vault").where("factory_id", "==", factory_id).stream()
        return [d.to_dict() for d in docs]

    # --- Scenarios ---
    def save_scenario(self, scenario_id: str, data: dict[str, Any]) -> dict[str, Any]:
        doc_ref = self.client.collection("scenarios").document(scenario_id)
        payload = {**data, "id": scenario_id, "updated_at": dt.datetime.now(dt.timezone.utc)}
        doc_ref.set(payload, merge=True)
        return payload

    def get_scenario(self, scenario_id: str) -> dict[str, Any] | None:
        doc = self.client.collection("scenarios").document(scenario_id).get()
        return doc.to_dict() if doc.exists else None

    # --- Marketplace: Providers ---
    def save_provider(self, provider_id: str, data: dict[str, Any]) -> dict[str, Any]:
        doc_ref = self.client.collection("providers").document(provider_id)
        payload = {**data, "id": provider_id, "updated_at": dt.datetime.now(dt.timezone.utc)}
        doc_ref.set(payload, merge=True)
        return payload

    def get_provider(self, provider_id: str) -> dict[str, Any] | None:
        doc = self.client.collection("providers").document(provider_id).get()
        return doc.to_dict() if doc.exists else None

    def list_providers(self, provider_type: str | None = None, state: str | None = None,
                       limit: int = 50) -> list[dict[str, Any]]:
        query = self.client.collection("providers")
        if provider_type:
            query = query.where("provider_type", "==", provider_type)
        if state:
            query = query.where("state", "==", state)
        docs = query.limit(limit).stream()
        return [d.to_dict() for d in docs]

    # --- Marketplace: Materials ---
    def save_material(self, material_id: str, data: dict[str, Any]) -> dict[str, Any]:
        doc_ref = self.client.collection("materials").document(material_id)
        payload = {**data, "id": material_id, "updated_at": dt.datetime.now(dt.timezone.utc)}
        doc_ref.set(payload, merge=True)
        return payload

    def get_material(self, material_id: str) -> dict[str, Any] | None:
        doc = self.client.collection("materials").document(material_id).get()
        return doc.to_dict() if doc.exists else None

    def list_materials(self, limit: int = 50) -> list[dict[str, Any]]:
        docs = self.client.collection("materials").limit(limit).stream()
        return [d.to_dict() for d in docs]

    # --- Marketplace: RFQs & Quotes ---
    def save_rfq(self, rfq_id: str, data: dict[str, Any]) -> dict[str, Any]:
        doc_ref = self.client.collection("rfqs").document(rfq_id)
        payload = {**data, "id": rfq_id, "updated_at": dt.datetime.now(dt.timezone.utc)}
        doc_ref.set(payload, merge=True)
        return payload

    def get_rfq(self, rfq_id: str) -> dict[str, Any] | None:
        doc = self.client.collection("rfqs").document(rfq_id).get()
        return doc.to_dict() if doc.exists else None

    def list_rfqs(self, factory_id: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
        query = self.client.collection("rfqs")
        if factory_id:
            query = query.where("factory_id", "==", factory_id)
        docs = query.limit(limit).stream()
        return [d.to_dict() for d in docs]

    def save_quote(self, quote_id: str, data: dict[str, Any]) -> dict[str, Any]:
        doc_ref = self.client.collection("quotes").document(quote_id)
        payload = {**data, "id": quote_id, "updated_at": dt.datetime.now(dt.timezone.utc)}
        doc_ref.set(payload, merge=True)
        return payload

    def list_quotes_by_rfq(self, rfq_id: str) -> list[dict[str, Any]]:
        docs = self.client.collection("quotes").where("rfq_id", "==", rfq_id).stream()
        return [d.to_dict() for d in docs]


_repo: FirestoreRepository | None = None


def get_firestore_repo() -> FirestoreRepository:
    """Singleton getter for FirestoreRepository."""
    global _repo
    if _repo is None:
        _repo = FirestoreRepository()
    return _repo
