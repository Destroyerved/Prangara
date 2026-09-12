"""
PRANGARA Compliance Engine — Rule-Pack Evaluator (BE-2 Service).

Evaluates live plant operational profiles and assessments against:
1. European Union Carbon Border Adjustment Mechanism (EU CBAM - Regulation 2023/956)
2. India Carbon Credit Trading Scheme (BEE / CCTS Notification 2025)
3. SEBI Business Responsibility and Sustainability Reporting (BRSR Core 2024/2025)

Preserves the deterministic engine boundary (PRD section 3.1):
Thresholds and applicability logic are pure deterministic rules loaded from
versioned rule packs in `datasets/data/clean/compliance_rule_packs/`.
"""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import Assessment
from app.models.factory import Factory, FactoryProfile
from app.models.governance import ComplianceCase, Event
from app.services import audit
from app.services import events as bus

log = logging.getLogger("prangara.compliance")

_CBAM_COVERED_SECTORS = {
    "iron_steel", "steel", "foundry_casting", "foundry", "aluminium", "cement", "chemicals",
}

# Root dataset directory lookup
_DATASET_DIR = Path(__file__).resolve().parents[3] / "datasets" / "data" / "clean" / "compliance_rule_packs"


def _load_rule_pack(filename: str) -> dict[str, Any]:
    path = _DATASET_DIR / filename
    if path.is_file():
        try:
            with open(path, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            log.warning("failed to parse rule pack file: %s", path)
    return {}


def evaluate_factory_compliance(db: Session, factory_id: str,
                                assessment_id: str | None = None,
                                actor_user_id: str | None = None) -> list[ComplianceCase]:
    """Evaluate compliance rules for a factory and persist ComplianceCase records."""
    factory = db.get(Factory, factory_id)
    if factory is None:
        log.warning("compliance evaluation skipped: factory %s not found", factory_id)
        return []

    # Get assessment
    if assessment_id:
        assessment = db.get(Assessment, assessment_id)
    else:
        assessment = db.scalar(
            select(Assessment)
            .where(Assessment.factory_id == factory.id, Assessment.is_baseline.is_(True))
            .order_by(Assessment.created_at.desc())
            .limit(1)
        )

    if assessment is None:
        log.warning("compliance evaluation skipped: no assessment for factory %s", factory_id)
        return []

    profile = db.get(FactoryProfile, assessment.profile_id) if assessment.profile_id else None
    engine_profile = assessment.engine_profile or {}
    footprint = assessment.result.get("footprint", {}) if assessment.result else {}
    recommendations = assessment.result.get("recommendations", {}) if assessment.result else {}

    sector = factory.sector or "general"
    eu_export_pct = float(
        engine_profile.get("eu_export_share_pct")
        or (profile.eu_export_share_pct if profile else 0)
        or 0
    )
    annual_prod_t = float(
        engine_profile.get("annual_output_t")
        or (profile.annual_output_t if profile else 1000)
        or 1000
    )

    scope1 = float(assessment.scope1_tco2e or footprint.get("scope1_tco2e") or 0.0)
    scope2 = float(assessment.scope2_tco2e or footprint.get("scope2_tco2e") or 0.0)
    scope3 = float(assessment.scope3_tco2e or footprint.get("scope3_tco2e") or 0.0)
    dq_score = float(assessment.data_quality_score or 50.0)

    evaluated_cases: list[dict[str, Any]] = []

    # -----------------------------------------------------------------------
    # 1. EU CBAM Rule Pack
    # -----------------------------------------------------------------------
    is_cbam_sector = sector in _CBAM_COVERED_SECTORS
    if is_cbam_sector and eu_export_pct > 0:
        direct_emissions = scope1 + scope2
        exposed_tonnes = direct_emissions * (eu_export_pct / 100.0)
        benchmark_price_inr = 7650.0  # €85/tCO2e @ ₹90/EUR statutory benchmark
        financial_exposure_inr = round(exposed_tonnes * benchmark_price_inr)

        evaluated_cases.append({
            "rule_id": "CBAM_DEFINITIVE_EXPOSURE_001",
            "rule_pack": "CBAM",
            "rule_pack_version": "2026.1",
            "source_ids": ["SRC-EU-CBAM-2026"],
            "severity": "critical" if financial_exposure_inr > 1_000_000 else "high",
            "status": "ACTION_REQUIRED",
            "flow_state": "FLAGGED",
            "requires_human_review": True,
            "title": "EU CBAM Definitive Regime Border Exposure",
            "reason": (
                f"Facility exports {eu_export_pct:.1f}% of production to the EU under CBAM covered "
                f"sector '{sector}'. An estimated {exposed_tonnes:,.1f} tCO2e of Scope 1 & 2 embedded "
                f"emissions are subject to mandatory surrender with ~₹{financial_exposure_inr:,.0f} "
                "indicative annual certificate exposure."
            ),
            "required_evidence": [
                "eu_export_customs_declaration",
                "embedded_emissions_epd",
                "third_party_verification_statement",
            ],
        })
    elif eu_export_pct > 0:
        evaluated_cases.append({
            "rule_id": "CBAM_WATCHLIST_002",
            "rule_pack": "CBAM",
            "rule_pack_version": "2026.1",
            "source_ids": ["SRC-EU-CBAM-2026"],
            "severity": "low",
            "status": "PARTIAL",
            "flow_state": "FLAGGED",
            "requires_human_review": False,
            "title": "EU CBAM Phase 2 Scope Extension Watch",
            "reason": (
                f"Sector '{sector}' is under active review for EU CBAM expansion (polymers, textiles, "
                f"specialty parts). Current EU export exposure is {eu_export_pct:.1f}%."
            ),
            "required_evidence": ["export_invoices", "scope12_activity_logs"],
        })

    # -----------------------------------------------------------------------
    # 2. India CCTS Rule Pack (BEE / Carbon Credit Trading Scheme)
    # -----------------------------------------------------------------------
    # ~700 toe (~30,000 GJ) thermal threshold or large industrial output
    thermal_gj = scope1 / 0.095 if scope1 > 0 else 0.0
    is_obligated_ccts = thermal_gj >= 30000.0 or annual_prod_t >= 25000.0

    if is_obligated_ccts:
        evaluated_cases.append({
            "rule_id": "CCTS_OBLIGATED_GEI_001",
            "rule_pack": "CCTS",
            "rule_pack_version": "2025.1",
            "source_ids": ["SRC-BEE-CCTS-2025"],
            "severity": "high",
            "status": "ACTION_REQUIRED",
            "flow_state": "FLAGGED",
            "requires_human_review": True,
            "title": "India CCTS Statutory GEI Trajectory Compliance",
            "reason": (
                "Plant energy/production exceeds statutory designated consumer threshold. Mandatory "
                "Greenhouse Gas Emission Intensity (GEI) reduction trajectory applies under BEE CCTS."
            ),
            "required_evidence": [
                "bee_designated_consumer_filing",
                "form1_energy_audit_report",
                "baseline_production_verification",
            ],
        })
    else:
        # Voluntary credit potential
        cash_positive = recommendations.get("portfolio", {}).get("cash_positive_only", {})
        abatement_pot = cash_positive.get("abatement_tco2e", 0.0)
        evaluated_cases.append({
            "rule_id": "CCTS_VOLUNTARY_OFFSET_002",
            "rule_pack": "CCTS",
            "rule_pack_version": "2025.1",
            "source_ids": ["SRC-BEE-CCTS-2025"],
            "severity": "low",
            "status": "READY" if abatement_pot > 0 else "PARTIAL",
            "flow_state": "FLAGGED",
            "requires_human_review": False,
            "title": "India CCTS Voluntary Carbon Offset Opportunity",
            "reason": (
                f"Facility qualifies for voluntary Carbon Credit Certificates (CCCs) under BEE offset "
                f"provisions. Estimated {abatement_pot:,.1f} tCO2e/yr eligible from circular interventions."
            ),
            "required_evidence": ["macc_intervention_dossier", "project_concept_note"],
        })

    # -----------------------------------------------------------------------
    # 3. SEBI BRSR Core (Value Chain Readiness)
    # -----------------------------------------------------------------------
    if scope3 > 0 and dq_score >= 60:
        evaluated_cases.append({
            "rule_id": "BRSR_CORE_READY_001",
            "rule_pack": "BRSR",
            "rule_pack_version": "2025.1",
            "source_ids": ["SRC-SEBI-BRSR-2024"],
            "severity": "low",
            "status": "READY",
            "flow_state": "FLAGGED",
            "requires_human_review": False,
            "title": "SEBI BRSR Core Value Chain Assurance Ready",
            "reason": (
                f"Complete Scope 1, 2, and 3 accounting with data quality score of {dq_score:.0f}/100. "
                "Meets reasonable assurance readiness for top 250 listed corporate supply chain partners."
            ),
            "required_evidence": ["ghg_inventory_report", "scope3_supplier_declaration"],
        })
    else:
        gaps = []
        if scope3 == 0:
            gaps.append("Scope 3 value chain emissions missing")
        if dq_score < 60:
            gaps.append(f"data quality score {dq_score:.0f}/100 below 60/100 threshold")
        evaluated_cases.append({
            "rule_id": "BRSR_CORE_DATA_GAP_002",
            "rule_pack": "BRSR",
            "rule_pack_version": "2025.1",
            "source_ids": ["SRC-SEBI-BRSR-2024"],
            "severity": "medium",
            "status": "PARTIAL",
            "flow_state": "FLAGGED",
            "requires_human_review": False,
            "title": "SEBI BRSR Core Supply Chain Data Gap",
            "reason": f"Supply chain disclosure incomplete: {'; '.join(gaps)}.",
            "required_evidence": ["utility_bill", "fuel_invoice", "material_delivery_note"],
        })

    # -----------------------------------------------------------------------
    # Persist and update ComplianceCase records
    # -----------------------------------------------------------------------
    existing_cases = {
        c.rule_id: c
        for c in db.scalars(
            select(ComplianceCase).where(
                ComplianceCase.factory_id == factory.id,
                ComplianceCase.closed_at.is_(None),
            )
        ).all()
    }

    result_cases: list[ComplianceCase] = []
    for item in evaluated_cases:
        rule_id = item["rule_id"]
        existing = existing_cases.get(rule_id)
        if existing:
            # Update dynamic metrics/reason
            existing.severity = item["severity"]
            existing.status = item["status"]
            existing.reason = item["reason"]
            existing.assessment_id = assessment.id
            result_cases.append(existing)
        else:
            new_case = ComplianceCase(
                organization_id=factory.organization_id,
                factory_id=factory.id,
                assessment_id=assessment.id,
                rule_id=rule_id,
                rule_pack=item["rule_pack"],
                rule_pack_version=item["rule_pack_version"],
                source_ids=item["source_ids"],
                severity=item["severity"],
                status=item["status"],
                flow_state=item["flow_state"],
                requires_human_review=item["requires_human_review"],
                title=item["title"],
                reason=item["reason"],
                required_evidence=item["required_evidence"],
            )
            db.add(new_case)
            db.flush()

            audit.record(
                db,
                action="compliance.case.auto_evaluate",
                object_type="compliance_case",
                object_id=new_case.id,
                organization_id=factory.organization_id,
                actor_user_id=actor_user_id,
                actor_label="System Evaluator",
                correlation_id=assessment.id,
                new_value={
                    "rule_id": new_case.rule_id,
                    "rule_pack": new_case.rule_pack,
                    "severity": new_case.severity,
                    "status": new_case.status,
                },
            )
            bus.emit(
                db,
                bus.COMPLIANCE_CASE_CREATED,
                organization_id=factory.organization_id,
                factory_id=factory.id,
                actor_user_id=actor_user_id,
                correlation_id=new_case.id,
                payload={
                    "case_id": new_case.id,
                    "rule_id": new_case.rule_id,
                    "rule_pack": new_case.rule_pack,
                    "severity": new_case.severity,
                    "title": new_case.title,
                },
            )
            result_cases.append(new_case)

    return result_cases


def on_compliance_evaluation_requested(db: Session, event: Event) -> None:
    """Outbox event handler attached to COMPLIANCE_EVALUATION_REQUESTED."""
    factory_id = event.factory_id
    if not factory_id:
        return
    assessment_id = event.payload.get("assessment_id") or event.correlation_id
    actor_user_id = event.actor_user_id
    cases = evaluate_factory_compliance(
        db, factory_id=factory_id, assessment_id=assessment_id, actor_user_id=actor_user_id
    )
    log.info("evaluated compliance for factory %s: %d case(s)", factory_id, len(cases))


def register_handlers() -> None:
    """Register compliance evaluator with the outbox event bus."""
    bus.register(bus.COMPLIANCE_EVALUATION_REQUESTED, on_compliance_evaluation_requested)
