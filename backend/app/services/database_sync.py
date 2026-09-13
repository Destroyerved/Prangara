"""
Database synchronization service.
Mirrors updates from primary relational models (SQLite / PostgreSQL)
into Google Cloud Firestore documents ('prangara-01') whenever Firestore is active.
"""
from __future__ import annotations

import datetime as dt
import logging
from typing import Any

from app.services.firestore_repo import get_firestore_repo

logger = logging.getLogger("prangara.database_sync")


class DatabaseSyncService:
    def __init__(self) -> None:
        self.repo = get_firestore_repo()

    @property
    def is_active(self) -> bool:
        return self.repo.is_active

    def sync_user(self, user_id: str, data: dict[str, Any]) -> None:
        """Sync user document to Firestore."""
        if not self.is_active:
            return
        try:
            # Filter out sensitive fields like password hashes
            safe_data = {k: v for k, v in data.items() if k not in ("password_hash", "token_hash")}
            self.repo.save_user(user_id, safe_data)
            logger.debug("Synced user %s to Firestore", user_id)
        except Exception as e:
            logger.warning("Failed to sync user %s to Firestore: %s", user_id, e)

    def sync_organization(self, org_id: str, data: dict[str, Any]) -> None:
        """Sync organization document to Firestore."""
        if not self.is_active:
            return
        try:
            self.repo.save_organization(org_id, data)
            logger.debug("Synced organization %s to Firestore", org_id)
        except Exception as e:
            logger.warning("Failed to sync organization %s to Firestore: %s", org_id, e)

    def sync_factory(self, factory_id: str, data: dict[str, Any]) -> None:
        """Sync factory profile document to Firestore."""
        if not self.is_active:
            return
        try:
            self.repo.save_factory(factory_id, data)
            logger.debug("Synced factory %s to Firestore", factory_id)
        except Exception as e:
            logger.warning("Failed to sync factory %s to Firestore: %s", factory_id, e)

    def sync_assessment(self, assessment_id: str, data: dict[str, Any]) -> None:
        """Sync assessment document to Firestore."""
        if not self.is_active:
            return
        try:
            self.repo.save_assessment(assessment_id, data)
            logger.debug("Synced assessment %s to Firestore", assessment_id)
        except Exception as e:
            logger.warning("Failed to sync assessment %s to Firestore: %s", assessment_id, e)

    def sync_evidence(self, evidence_id: str, data: dict[str, Any]) -> None:
        """Sync evidence record to Firestore evidence_vault."""
        if not self.is_active:
            return
        try:
            self.repo.save_evidence(evidence_id, data)
            logger.debug("Synced evidence %s to Firestore", evidence_id)
        except Exception as e:
            logger.warning("Failed to sync evidence %s to Firestore: %s", evidence_id, e)

    def sync_scenario(self, scenario_id: str, data: dict[str, Any]) -> None:
        """Sync scenario to Firestore."""
        if not self.is_active:
            return
        try:
            self.repo.save_scenario(scenario_id, data)
            logger.debug("Synced scenario %s to Firestore", scenario_id)
        except Exception as e:
            logger.warning("Failed to sync scenario %s to Firestore: %s", scenario_id, e)

    def sync_provider(self, provider_id: str, data: dict[str, Any]) -> None:
        """Sync clean tech provider to Firestore."""
        if not self.is_active:
            return
        try:
            self.repo.save_provider(provider_id, data)
            logger.debug("Synced provider %s to Firestore", provider_id)
        except Exception as e:
            logger.warning("Failed to sync provider %s to Firestore: %s", provider_id, e)

    def sync_material(self, material_id: str, data: dict[str, Any]) -> None:
        """Sync circular material listing to Firestore."""
        if not self.is_active:
            return
        try:
            self.repo.save_material(material_id, data)
            logger.debug("Synced material %s to Firestore", material_id)
        except Exception as e:
            logger.warning("Failed to sync material %s to Firestore: %s", material_id, e)

    def sync_rfq(self, rfq_id: str, data: dict[str, Any]) -> None:
        """Sync RFQ to Firestore."""
        if not self.is_active:
            return
        try:
            self.repo.save_rfq(rfq_id, data)
            logger.debug("Synced rfq %s to Firestore", rfq_id)
        except Exception as e:
            logger.warning("Failed to sync rfq %s to Firestore: %s", rfq_id, e)

    def sync_quote(self, quote_id: str, data: dict[str, Any]) -> None:
        """Sync quote to Firestore."""
        if not self.is_active:
            return
        try:
            self.repo.save_quote(quote_id, data)
            logger.debug("Synced quote %s to Firestore", quote_id)
        except Exception as e:
            logger.warning("Failed to sync quote %s to Firestore: %s", quote_id, e)

    def sync_action(self, action_id: str, data: dict[str, Any]) -> None:
        """Sync decarbonization action to Firestore."""
        if not self.is_active:
            return
        try:
            self.repo.save_action(action_id, data)
            logger.debug("Synced action %s to Firestore", action_id)
        except Exception as e:
            logger.warning("Failed to sync action %s to Firestore: %s", action_id, e)

    def sync_compliance_case(self, case_id: str, data: dict[str, Any]) -> None:
        """Sync compliance case to Firestore."""
        if not self.is_active:
            return
        try:
            self.repo.save_compliance_case(case_id, data)
            logger.debug("Synced compliance case %s to Firestore", case_id)
        except Exception as e:
            logger.warning("Failed to sync compliance case %s to Firestore: %s", case_id, e)

    def sync_shipment(self, shipment_id: str, data: dict[str, Any]) -> None:
        """Sync shipment to Firestore."""
        if not self.is_active:
            return
        try:
            self.repo.save_shipment(shipment_id, data)
            logger.debug("Synced shipment %s to Firestore", shipment_id)
        except Exception as e:
            logger.warning("Failed to sync shipment %s to Firestore: %s", shipment_id, e)

    def sync_activity_record(self, record_id: str, data: dict[str, Any]) -> None:
        """Sync activity record or machine telemetry to Firestore."""
        if not self.is_active:
            return
        try:
            self.repo.save_activity_record(record_id, data)
            logger.debug("Synced activity record %s to Firestore", record_id)
        except Exception as e:
            logger.warning("Failed to sync activity record %s to Firestore: %s", record_id, e)



_sync_service: DatabaseSyncService | None = None


def get_db_sync() -> DatabaseSyncService:
    global _sync_service
    if _sync_service is None:
        _sync_service = DatabaseSyncService()
    return _sync_service
