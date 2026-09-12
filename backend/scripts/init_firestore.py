"""
Firestore database initializer and demo seeder.
Connects to Google Cloud Firestore (project 'prangara-01') and populates
the initial collections with realistic industrial manufacturing demonstration data.

Usage:
    python -m scripts.init_firestore
"""
from __future__ import annotations

import datetime as dt
import json
import logging
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings
from app.core.firestore_db import get_firestore_client
from app.services.firestore_repo import get_firestore_repo

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("init_firestore")


def seed_firestore():
    client = get_firestore_client()
    if not client:
        logger.error(
            "Cannot connect to Firestore. Please ensure FIRESTORE_PROJECT_ID and "
            "FIREBASE_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS are set."
        )
        return False

    repo = get_firestore_repo()
    logger.info(f"Connected to Firestore project: {client.project}")

    # 1. Seed Organization
    org_id = "org_demo_tirupur"
    logger.info("Seeding Organization: Arunachala Textiles...")
    repo.save_organization(org_id, {
        "name": "Arunachala Textiles Pvt Ltd",
        "legal_name": "Arunachala Textiles Processing Unit Private Limited",
        "type": "manufacturer",
        "state": "Tamil Nadu",
        "cluster": "Tirupur Textile Cluster",
        "created_at": dt.datetime.now(dt.timezone.utc),
    })

    # 2. Seed User
    user_id = "usr_demo_plant_head"
    logger.info("Seeding User: planthead@tirupur.demo...")
    repo.save_user(user_id, {
        "email": "planthead@tirupur.demo",
        "full_name": "S. Murugan",
        "role": "owner",
        "organization_id": org_id,
        "created_at": dt.datetime.now(dt.timezone.utc),
    })

    # 3. Seed Factory
    fac_id = "fac_tirupur_dyeing"
    logger.info("Seeding Factory: Tirupur Knitwear Dyeing Unit...")
    repo.save_factory(fac_id, {
        "organization_id": org_id,
        "name": "Tirupur Knitwear Dyeing Unit",
        "sector": "textile_dyeing",
        "state": "Tamil Nadu",
        "coordinates": {"lat": 11.1085, "lng": 77.3411},
        "profile": {
            "annual_output_t": 2400.0,
            "annual_revenue_cr": 34.0,
            "employees": 180,
            "electricity_kwh": 3000000.0,
            "tariff_inr_per_kwh": 8.5,
            "fuels": {
                "COAL_INDIAN": 3900.0,
                "DIESEL": 42000.0,
            },
            "materials": {
                "COTTON_CONV": 2650.0,
                "PET_VIRGIN": 180.0,
            },
            "waste": {
                "LANDFILL_ORGANIC": 220.0,
                "LANDFILL_INERT": 410.0,
            },
            "freight": {
                "ROAD_FREIGHT_HCV": 1950000.0,
            },
            "eu_export_share_pct": 25.0,
        },
    })

    # 4. Seed Assessment
    asm_id = "asm_tirupur_baseline"
    logger.info("Seeding Assessment: Baseline Carbon & Compliance Audit...")
    repo.save_assessment(asm_id, {
        "factory_id": fac_id,
        "organization_id": org_id,
        "label": "Annual Baseline Assessment FY25-26",
        "is_baseline": True,
        "headline_metrics": {
            "total_tco2e": 14280.0,
            "scope1_tco2e": 7820.0,
            "scope2_tco2e": 2430.0,
            "scope3_tco2e": 4030.0,
            "thermal_gj": 42860.0,
            "cash_positive_benefit_inr": 4820000.0,
            "cash_positive_abatement_tco2e": 3420.0,
        },
        "compliance": {
            "cbam": {
                "applicable": False,
                "status": "phase_2_watchlist",
                "indicative_cost": None,
                "applicability": "Outside Phase 1 Annex I coverage (Textiles). ₹0 statutory liability.",
            },
            "ccts": {
                "applicable": True,
                "status": "obligated",
                "designated_consumer_status": "Designated Consumer (Obligated)",
                "plant_thermal_gj": 42860.0,
                "designated_consumer_threshold_gj": 30000.0,
                "voluntary_ccc_potential_tco2e": 1250.0,
                "mechanism": "Bureau of Energy Efficiency (BEE) Carbon Credit Trading Scheme",
            },
            "brsr": {
                "status": "Working Papers Ready (Audit Pending)",
                "scope12_tco2e_per_cr_rev": 301.47,
            },
        },
        "created_at": dt.datetime.now(dt.timezone.utc),
    })

    # 5. Seed Evidence Document
    doc_id = "doc_electricity_bill_q1"
    logger.info("Seeding Evidence Vault item...")
    repo.save_evidence(doc_id, {
        "factory_id": fac_id,
        "filename": "TANGEDCO_HighTension_HTSC_4201_Bill.pdf",
        "file_type": "application/pdf",
        "file_size_bytes": 142850,
        "status": "verified",
        "extracted_data": {
            "meter_number": "HT-4201-B",
            "billed_units_kwh": 750000,
            "billed_amount_inr": 6375000.0,
            "billing_period": "2025-04 to 2025-06",
        },
    })

    # 6. Seed Marketplace Providers
    logger.info("Seeding Marketplace Providers...")
    repo.save_provider("prv_coimbatore_circular", {
        "name": "Coimbatore Circular Fibres",
        "provider_type": "recycler",
        "state": "Tamil Nadu",
        "district": "Coimbatore",
        "latitude": 11.0168,
        "longitude": 76.9558,
        "service_states": ["Tamil Nadu", "Kerala", "Karnataka"],
        "verification_status": "verified",
        "rating": 4.8,
        "rating_count": 32,
        "typical_lead_time_days": 10,
        "is_demo_seed": True,
    })
    repo.save_provider("prv_gujarat_energy", {
        "name": "Gujarat Energy Services",
        "provider_type": "installation_contractor",
        "state": "Gujarat",
        "district": "Rajkot",
        "latitude": 22.31,
        "longitude": 70.81,
        "service_states": ["Gujarat", "Maharashtra", "Rajasthan"],
        "verification_status": "verified",
        "rating": 4.6,
        "rating_count": 24,
        "typical_lead_time_days": 21,
        "is_demo_seed": True,
    })

    # 7. Seed Circular Materials
    logger.info("Seeding Marketplace Materials...")
    repo.save_material("mtl_cotton_yarn_recycled", {
        "name": "Mechanical Post-Industrial Recycled Cotton Yarn (20s Count)",
        "material_key": "COTTON_RECYCLED",
        "grade": "Ring-Spun 20s",
        "recycled_content_pct": 80.0,
        "embodied_tco2e_per_t": 0.65,
        "embodied_source": "PRANGARA reference registry (COTTON_RECYCLED)",
        "price_inr_per_t": 85000.0,
        "moq_t": 2.0,
        "stock_t": 85.0,
        "state": "Tamil Nadu",
        "is_active": True,
        "is_demo_seed": True,
    })
    repo.save_material("mtl_rpet_flake", {
        "name": "Food-grade rPET flake",
        "material_key": "PET_RECYCLED",
        "grade": "FG-100",
        "recycled_content_pct": 100.0,
        "embodied_tco2e_per_t": 1.4,
        "embodied_source": "PRANGARA reference registry (PET_RECYCLED)",
        "price_inr_per_t": 78000.0,
        "moq_t": 5.0,
        "stock_t": 240.0,
        "state": "Gujarat",
        "is_active": True,
        "is_demo_seed": True,
    })

    # 8. Seed RFQs
    logger.info("Seeding Marketplace RFQ...")
    repo.save_rfq("rfq_tirupur_vfd", {
        "factory_id": fac_id,
        "organization_id": org_id,
        "title": "Variable frequency drives on stenter exhaust fans",
        "intervention_id": "VFD_MOTORS",
        "status": "QUOTED",
        "scope_of_work": "Supply, installation and baseline verification report.",
        "quote_count": 2,
    })

    logger.info("Successfully seeded Firestore collections!")
    logger.info("Check your Firebase Console to see 'organizations', 'users', 'factories', 'assessments', 'evidence_vault', 'providers', 'materials', and 'rfqs'.")
    return True


if __name__ == "__main__":
    seed_firestore()

