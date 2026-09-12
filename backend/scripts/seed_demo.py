"""
Seed the demo dataset.

    python -m scripts.seed_demo          # create if absent
    python -m scripts.seed_demo --reset  # delete the seeded rows and recreate

Ownership (task.md sections 10 and 13): BE-1 owns the seed *command* - that it
runs, that it is idempotent, and that no manual database editing is ever needed
for the demo. BE-2 owns the seeded reference data and will extend this with
compliance cases, logistics and RAG fixtures.

Everything created here is flagged `is_demo_seed` where the model has the field,
and every seeded organization uses an `@demo.prangara.example` address, so
seeded rows can always be told apart from real ones and removed cleanly.

The activity figures are plausible screening values for the sector, not measured
data from a real plant. They exist to make the demo path runnable.
"""
from __future__ import annotations

import argparse
import datetime as dt
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models.action import Action  # noqa: E402
from app.models.assessment import Assessment  # noqa: E402
from app.models.base import utcnow  # noqa: E402
from app.models.factory import ActivityRecord, Factory, FactoryProfile, FactorySite  # noqa: E402
from app.models.identity import (  # noqa: E402
    ROLE_COMPLIANCE_OFFICER, ROLE_OWNER, ROLE_PLATFORM_ADMIN, ROLE_PROVIDER_USER,
    FactoryAccess, Membership, Organization, User,
)
from app.models.marketplace import (  # noqa: E402
    ImplementationJob, MaterialListing, Provider, ProviderService, Quote, RFQ, RFQInvite,
)
from app.services.assessment_service import run_assessment  # noqa: E402

# RFC 2606 reserves `.example` for documentation, so a seeded address can never
# collide with a real mailbox. `.invalid` would be equally unroutable but email
# validators reject it outright, and a seeded account that cannot sign in defeats
# the entire point of the seed command.
DEMO_DOMAIN = "demo.prangara.example"
DEMO_PASSWORD = "prangara-demo-2026"

# --- people ----------------------------------------------------------------
ACCOUNTS = [
    ("admin", "PRANGARA Platform", "platform", ROLE_PLATFORM_ADMIN, "Priya Admin"),
    ("owner", "Rajkot Metal Works", "manufacturer", ROLE_OWNER, "Hitesh Patel"),
    ("compliance", "Shah and Associates", "consultant", ROLE_COMPLIANCE_OFFICER, "Anita Shah"),
]

# --- factories --------------------------------------------------------------
# (key, name, sector, state, district, lat, lon, output_t, revenue_cr, employees,
#  tariff, eu_export_pct, activity rows)
FACTORIES = [
    (
        "hero", "Rajkot Metal Works", "foundry_casting", "Gujarat", "Rajkot",
        22.3039, 70.8022, 4200.0, 48.0, 145, 8.2, 22.0,
        [
            ("electricity", None, "Purchased electricity", 3_400_000, "kWh", 8.2),
            ("fuel", "COAL_INDIAN", "Cupola coke and coal", 900, "tonne", None),
            ("fuel", "DIESEL", "DG set diesel", 42_000, "litre", None),
            ("material", "STEEL_PRIMARY", "Pig iron and primary steel", 3_600, "tonne", None),
            ("material", "STEEL_SECONDARY", "Purchased scrap", 1_100, "tonne", None),
            ("waste", "LANDFILL_INERT", "Spent foundry sand", 260, "tonne", None),
            ("freight", "ROAD_FREIGHT_HCV", "Inbound and outbound road freight",
             1_900_000, "tonne-km", None),
        ],
    ),
    (
        "textile", "Surat Dyeing and Processing", "textile_dyeing", "Gujarat", "Surat",
        21.1702, 72.8311, 2400.0, 31.0, 96, 8.6, 8.0,
        [
            ("electricity", None, "Purchased electricity", 2_150_000, "kWh", 8.6),
            ("fuel", "COAL_INDIAN", "Boiler coal", 1_450, "tonne", None),
            ("material", "COTTON_CONV", "Grey cotton fabric", 2_600, "tonne", None),
            ("waste", "LANDFILL_ORGANIC", "ETP sludge", 180, "tonne", None),
            ("freight", "ROAD_FREIGHT_LCV", "Local road freight", 420_000, "tonne-km", None),
        ],
    ),
    (
        "plastics", "Vapi Precision Mouldings", "plastic_moulding", "Gujarat", "Valsad",
        20.3716, 72.9060, 1650.0, 22.0, 64, 8.0, 0.0,
        [
            ("electricity", None, "Purchased electricity", 1_780_000, "kWh", 8.0),
            ("material", "PET_VIRGIN", "Virgin PET resin", 1_500, "tonne", None),
            ("waste", "RECYCLING_GENERIC", "Runner and purge regrind sold out",
             120, "tonne", None),
            ("freight", "ROAD_FREIGHT_HCV", "Road freight", 610_000, "tonne-km", None),
        ],
    ),
]

# --- providers ---------------------------------------------------------------
PROVIDERS = [
    {
        "slug": "gujarat-energy",
        "name": "Gujarat Energy Services",
        "provider_type": "installation_contractor",
        "state": "Gujarat", "district": "Rajkot", "lat": 22.31, "lon": 70.81,
        "service_states": ["Gujarat", "Maharashtra", "Rajasthan"],
        "certifications": ["BEE Certified Energy Auditor", "ISO 9001:2015"],
        "verification_status": "verified", "rating": 4.6, "rating_count": 24,
        "lead_time": 21,
        "services": [
            {"category": "energy", "name": "VFD and premium motor retrofit",
             "intervention_ids": ["VFD_MOTORS", "IE4_MOTORS", "VFD_RETROFIT", "MOTOR_IE3_UPGRADE"],
             "indicative_price_inr": 480_000, "price_basis": "per installation",
             "warranty_months": 24, "lead_time_days": 21},
            {"category": "energy", "name": "Compressed air leak survey and repair",
             "intervention_ids": ["AIR_LEAK_AUDIT", "AIR_LEAK_FIX"],
             "indicative_price_inr": 180_000, "price_basis": "per survey",
             "warranty_months": 12, "lead_time_days": 10},
            {"category": "energy", "name": "Power factor correction & APFC panel retrofit",
             "intervention_ids": ["PF_CORRECTION"],
             "indicative_price_inr": 320_000, "price_basis": "per installation",
             "warranty_months": 24, "lead_time_days": 15},
            {"category": "energy", "name": "Industrial high-bay LED retrofit",
             "intervention_ids": ["LED_RETROFIT"],
             "indicative_price_inr": 150_000, "price_basis": "per facility",
             "warranty_months": 36, "lead_time_days": 7},
        ],
    },
    {
        "slug": "saurashtra-thermal",
        "name": "Saurashtra Thermal Solutions",
        "provider_type": "esco",
        "state": "Gujarat", "district": "Rajkot", "lat": 22.28, "lon": 70.77,
        "service_states": ["Gujarat", "Madhya Pradesh"],
        "certifications": ["BEE Grade-1 ESCO", "ISO 50001 implementation partner"],
        "verification_status": "verified", "rating": 4.3, "rating_count": 15,
        "lead_time": 45,
        "services": [
            {"category": "energy", "name": "Waste heat recovery on furnace & boiler exhaust",
             "intervention_ids": ["WASTE_HEAT_RECOVERY", "BOILER_ECONOMISER"],
             "indicative_price_inr": 2_600_000, "price_basis": "per system",
             "warranty_months": 36, "lead_time_days": 60},
            {"category": "energy", "name": "Steam line & valve thermal insulation upgrade",
             "intervention_ids": ["INSULATION_UPGRADE", "STEAM_TRAP_CONDENSATE"],
             "indicative_price_inr": 350_000, "price_basis": "per line",
             "warranty_months": 24, "lead_time_days": 14},
            {"category": "energy", "name": "Steam trap survey and condensate recovery",
             "intervention_ids": ["STEAM_TRAP_CONDENSATE"],
             "indicative_price_inr": 280_000, "price_basis": "per system",
             "warranty_months": 12, "lead_time_days": 12},
        ],
        "materials": [
            {"name": "High-Calorific Sugarcane Bagasse Pellets", "material_key": "BIOMASS_PELLETS",
             "grade": "Grade-A Dense", "recycled_content_pct": 100.0,
             "embodied_factor_key": "BIOMASS_PELLETS", "embodied_tco2e_per_t": 0.12,
             "embodied_source": "PRANGARA reference registry (BIOMASS_PELLETS)",
             "price_inr_per_t": 6_200, "moq_t": 15, "stock_t": 450,
             "certifications": ["ISO 17225-6", "Green Gold Certified"]},
        ],
    },
    {
        "slug": "western-recyclers",
        "name": "Western Recyclers Pvt Ltd",
        "provider_type": "recycled_material_supplier",
        "state": "Gujarat", "district": "Ahmedabad", "lat": 23.02, "lon": 72.57,
        "service_states": ["Gujarat", "Rajasthan", "Maharashtra"],
        "certifications": ["GRS Certified", "MoEFCC Registered Recycler"],
        "verification_status": "verified", "rating": 4.2, "rating_count": 19,
        "lead_time": 14,
        "services": [
            {"category": "material", "name": "Recycled PET and secondary steel scrap supply",
             "intervention_ids": ["RPET_SUB", "STEEL_SCRAP_SUB"],
             "indicative_price_inr": None, "price_basis": "per tonne",
             "warranty_months": None, "lead_time_days": 14},
            {"category": "waste", "name": "Spent foundry sand reclamation & secondary blend",
             "intervention_ids": ["FOUNDRY_SAND_RECLAIM", "WASTE_SEGREGATION"],
             "indicative_price_inr": 4_200, "price_basis": "per tonne processed",
             "warranty_months": None, "lead_time_days": 7},
        ],
        "materials": [
            {"name": "Food-grade rPET flake", "material_key": "PET_RECYCLED",
             "grade": "FG-100", "recycled_content_pct": 100.0,
             "embodied_factor_key": "PET_RECYCLED", "embodied_tco2e_per_t": 1.4,
             "embodied_source": "PRANGARA reference registry (PET_RECYCLED)",
             "price_inr_per_t": 78_000, "moq_t": 5, "stock_t": 240,
             "certifications": ["GRS", "FDA-NOL"]},
            {"name": "Sorted shredded steel scrap", "material_key": "STEEL_SECONDARY",
             "grade": "HMS 1", "recycled_content_pct": 100.0,
             "embodied_factor_key": "STEEL_SECONDARY", "embodied_tco2e_per_t": 0.7,
             "embodied_source": "PRANGARA reference registry (STEEL_SECONDARY)",
             "price_inr_per_t": 39_500, "moq_t": 20, "stock_t": 900,
             "certifications": ["IS 2549:1994"]},
            {"name": "Secondary Aluminium Foundry Alloy Ingot", "material_key": "ALUMINIUM_SECONDARY",
             "grade": "ADC-12", "recycled_content_pct": 95.0,
             "embodied_factor_key": "ALUMINIUM_SECONDARY", "embodied_tco2e_per_t": 1.85,
             "embodied_source": "PRANGARA reference registry (ALUMINIUM_SECONDARY)",
             "price_inr_per_t": 185_000, "moq_t": 5, "stock_t": 120,
             "certifications": ["BIS Approved"]},
        ],
    },
    {
        "slug": "coimbatore-circular",
        "name": "Coimbatore Circular Fibres",
        "provider_type": "recycler",
        "state": "Tamil Nadu", "district": "Coimbatore", "lat": 11.0168, "lon": 76.9558,
        "service_states": ["Tamil Nadu", "Kerala", "Karnataka", "Gujarat"],
        "certifications": ["Global Recycled Standard (GRS)", "OEKO-TEX Standard 100"],
        "verification_status": "verified", "rating": 4.8, "rating_count": 32,
        "lead_time": 10,
        "services": [
            {"category": "material", "name": "Textile pre-consumer scrap conversion & yarn spinning",
             "intervention_ids": ["RECYCLED_COTTON_SUB", "WASTE_SEGREGATION"],
             "indicative_price_inr": 65_000, "price_basis": "per tonne processed",
             "warranty_months": None, "lead_time_days": 10},
            {"category": "process", "name": "Closed-loop dye bath and effluent water recovery",
             "intervention_ids": ["DYE_WATER_CLOSED_LOOP"],
             "indicative_price_inr": 1_450_000, "price_basis": "per recovery unit",
             "warranty_months": 24, "lead_time_days": 30},
        ],
        "materials": [
            {"name": "Mechanical Post-Industrial Recycled Cotton Yarn (20s Count)", "material_key": "COTTON_RECYCLED",
             "grade": "Ring-Spun 20s", "recycled_content_pct": 80.0,
             "embodied_factor_key": "COTTON_RECYCLED", "embodied_tco2e_per_t": 0.65,
             "embodied_source": "PRANGARA reference registry (COTTON_RECYCLED)",
             "price_inr_per_t": 85_000, "moq_t": 2, "stock_t": 85,
             "certifications": ["GRS", "OEKO-TEX"]},
            {"name": "Comber Noil Fibre Raw Feedstock", "material_key": "COTTON_COMBER_NOIL",
             "grade": "Grade-A 100% Cotton", "recycled_content_pct": 100.0,
             "embodied_factor_key": "COTTON_COMBER_NOIL", "embodied_tco2e_per_t": 0.42,
             "embodied_source": "SITRA Cotton By-Product Assessment 2025",
             "price_inr_per_t": 52_000, "moq_t": 5, "stock_t": 150,
             "certifications": ["GRS"]},
        ],
    },
    {
        "slug": "apex-energy-audits",
        "name": "Apex Energy & Carbon Audits",
        "provider_type": "energy_auditor",
        "state": "Gujarat", "district": "Vadodara", "lat": 22.3072, "lon": 73.1812,
        "service_states": ["Gujarat", "Maharashtra", "Delhi", "Tamil Nadu"],
        "certifications": ["BEE Accredited Energy Auditor (AEA)", "ISO 14064 GHG Lead Verifier"],
        "verification_status": "verified", "rating": 4.9, "rating_count": 41,
        "lead_time": 7,
        "services": [
            {"category": "energy", "name": "Comprehensive plant energy & electrical load scheduling",
             "intervention_ids": ["IDLE_SCHEDULING", "AIR_LEAK_AUDIT", "PF_CORRECTION"],
             "indicative_price_inr": 220_000, "price_basis": "per audit cycle",
             "warranty_months": None, "lead_time_days": 7},
            {"category": "energy", "name": "Compressed air & thermal system ultrasonic survey",
             "intervention_ids": ["AIR_LEAK_AUDIT", "STEAM_TRAP_CONDENSATE"],
             "indicative_price_inr": 95_000, "price_basis": "per survey",
             "warranty_months": 6, "lead_time_days": 5},
            {"category": "process", "name": "Production scheduling & idle load elimination study",
             "intervention_ids": ["IDLE_SCHEDULING"],
             "indicative_price_inr": 140_000, "price_basis": "per plant schedule",
             "warranty_months": 12, "lead_time_days": 10},
        ],
    },
    {
        "slug": "tiru-heavy-haulage",
        "name": "Tirupur Green Freight & Logistics Pool",
        "provider_type": "transporter",
        "state": "Tamil Nadu", "district": "Tiruppur", "lat": 11.1085, "lon": 77.3411,
        "service_states": ["Tamil Nadu", "Karnataka", "Andhra Pradesh", "Maharashtra"],
        "certifications": ["SmartWay Logistics Partner", "ISO 14001:2015"],
        "verification_status": "verified", "rating": 4.5, "rating_count": 28,
        "lead_time": 3,
        "services": [
            {"category": "logistics", "name": "Shared corridor freight consolidation & return trip pooling",
             "intervention_ids": ["LOAD_CONSOLIDATION", "LOCAL_SOURCING"],
             "indicative_price_inr": 2_400, "price_basis": "per 1000 tonne-km",
             "warranty_months": None, "lead_time_days": 2},
            {"category": "logistics", "name": "Containerized intermodal road-to-rail transfer",
             "intervention_ids": ["RAIL_MODAL_SHIFT"],
             "indicative_price_inr": 18_500, "price_basis": "per 20ft TEU container",
             "warranty_months": None, "lead_time_days": 4},
        ],
    },
    {
        "slug": "bharat-clean-tech",
        "name": "Bharat CleanTech Equipment Ltd",
        "provider_type": "equipment_seller",
        "state": "Gujarat", "district": "Ahmedabad", "lat": 23.0339, "lon": 72.5850,
        "service_states": ["Gujarat", "Maharashtra", "Karnataka", "Tamil Nadu"],
        "certifications": ["MNRE Tier-1 Solar Channel Partner", "BEE Star Labelled OEM"],
        "verification_status": "verified", "rating": 4.7, "rating_count": 36,
        "lead_time": 14,
        "services": [
            {"category": "energy", "name": "Captive rooftop solar PV system supply & installation",
             "intervention_ids": ["SOLAR_ROOFTOP", "GENSET_DISPLACEMENT"],
             "indicative_price_inr": 3_400_000, "price_basis": "per 100 kWp turnkey",
             "warranty_months": 60, "lead_time_days": 30},
            {"category": "energy", "name": "IE4 super-premium efficiency industrial motors",
             "intervention_ids": ["IE4_MOTORS", "VFD_MOTORS"],
             "indicative_price_inr": 380_000, "price_basis": "per package (5 units)",
             "warranty_months": 36, "lead_time_days": 10},
            {"category": "energy", "name": "Solar thermal process water preheating collectors",
             "intervention_ids": ["SOLAR_THERMAL_PREHEAT"],
             "indicative_price_inr": 850_000, "price_basis": "per 5000 LPD setup",
             "warranty_months": 48, "lead_time_days": 21},
        ],
    },
    {
        "slug": "decarb-process-advisors",
        "name": "Decarb Process Advisors LLP",
        "provider_type": "process_consultant",
        "state": "Maharashtra", "district": "Pune", "lat": 18.5204, "lon": 73.8567,
        "service_states": ["Maharashtra", "Gujarat", "Karnataka"],
        "certifications": ["FICCI Sustainability Awardee", "CII Carbon Neutrality Assessor"],
        "verification_status": "verified", "rating": 4.6, "rating_count": 14,
        "lead_time": 10,
        "services": [
            {"category": "process", "name": "Industrial residue exchange & symbiosis structuring",
             "intervention_ids": ["INDUSTRIAL_SYMBIOSIS", "WASTE_SEGREGATION"],
             "indicative_price_inr": 350_000, "price_basis": "per contract",
             "warranty_months": 12, "lead_time_days": 21},
            {"category": "process", "name": "Fuel switch engineering (Coal to Biomass / Briquettes)",
             "intervention_ids": ["BIOMASS_BOILER_SWITCH"],
             "indicative_price_inr": 450_000, "price_basis": "per engineering pack",
             "warranty_months": 12, "lead_time_days": 14},
            {"category": "process", "name": "In-house regrind & zero waste process re-engineering",
             "intervention_ids": ["INHOUSE_REGRIND"],
             "indicative_price_inr": 280_000, "price_basis": "per production line",
             "warranty_months": 6, "lead_time_days": 14},
        ],
    },
    {
        "slug": "industrial-reliability-works",
        "name": "Industrial Reliability & Maintenance Services",
        "provider_type": "maintenance_company",
        "state": "Gujarat", "district": "Surat", "lat": 21.1702, "lon": 72.8311,
        "service_states": ["Gujarat", "Maharashtra"],
        "certifications": ["ISO 45001 Safety Certified"],
        "verification_status": "pending", "rating": 4.0, "rating_count": 8,
        "lead_time": 5,
        "services": [
            {"category": "energy", "name": "Preventive maintenance & predictive vibration analysis",
             "intervention_ids": ["IDLE_SCHEDULING", "VFD_MOTORS"],
             "indicative_price_inr": 120_000, "price_basis": "per quarterly AMC",
             "warranty_months": 3, "lead_time_days": 3},
            {"category": "energy", "name": "Compressed air & steam valve refurbishment",
             "intervention_ids": ["AIR_LEAK_AUDIT", "STEAM_TRAP_CONDENSATE"],
             "indicative_price_inr": 85_000, "price_basis": "per service overhaul",
             "warranty_months": 6, "lead_time_days": 5},
        ],
    },
    {
        "slug": "surat-shared-utilities",
        "name": "Surat Shared Industrial Utilities Co-op",
        "provider_type": "shared_capacity_provider",
        "state": "Gujarat", "district": "Surat", "lat": 21.2000, "lon": 72.8500,
        "service_states": ["Gujarat"],
        "certifications": ["GIDC Approved Common Infrastructure Facility"],
        "verification_status": "verified", "rating": 4.4, "rating_count": 22,
        "lead_time": 1,
        "services": [
            {"category": "energy", "name": "Common captive renewable open access wheeling",
             "intervention_ids": ["GREEN_OPEN_ACCESS"],
             "indicative_price_inr": 5, "price_basis": "per kWh delivered",
             "warranty_months": 36, "lead_time_days": 15},
            {"category": "energy", "name": "Shared steam & thermal generation cluster delivery",
             "intervention_ids": ["BIOMASS_BOILER_SWITCH", "WASTE_HEAT_RECOVERY"],
             "indicative_price_inr": 2_100, "price_basis": "per tonne steam",
             "warranty_months": 12, "lead_time_days": 7},
        ],
        "materials": [
            {"name": "Grade-1 Pozzolanic Pulverized Fuel Ash (Fly Ash)", "material_key": "FLY_ASH",
             "grade": "Class F Pozzolanic", "recycled_content_pct": 100.0,
             "embodied_factor_key": "FLY_ASH", "embodied_tco2e_per_t": 0.015,
             "embodied_source": "NTPC Thermal Power Fly Ash Registry",
             "price_inr_per_t": 850, "moq_t": 30, "stock_t": 2500,
             "certifications": ["IS 3812 Part 1"]},
            {"name": "Ground Granulated Blast Furnace Slag (GGBS)", "material_key": "GGBS_SLAG",
             "grade": "IS 16714:2018", "recycled_content_pct": 100.0,
             "embodied_factor_key": "GGBS_SLAG", "embodied_tco2e_per_t": 0.08,
             "embodied_source": "Indian Green Building Council (IGBC) EPD Registry",
             "price_inr_per_t": 3_200, "moq_t": 25, "stock_t": 1400,
             "certifications": ["GreenPro", "IS 16714"]},
            {"name": "Distilled & Recovered Spent Solvent (Isopropanol 99%)", "material_key": "SPENT_SOLVENT_IPA",
             "grade": "Technical Reclaim 99.2%", "recycled_content_pct": 100.0,
             "embodied_factor_key": "SPENT_SOLVENT_IPA", "embodied_tco2e_per_t": 0.38,
             "embodied_source": "MoEFCC Hazardous Waste Circular Registry",
             "price_inr_per_t": 48_000, "moq_t": 1, "stock_t": 45,
             "certifications": ["GPCB Authorized Circular Stream"]},
        ],
    },
]


def _email(slug: str) -> str:
    return f"{slug}@{DEMO_DOMAIN}"


def wipe(db) -> int:
    """Remove everything this script created. Never touches real rows."""
    users = db.scalars(select(User).where(User.email.like(f"%@{DEMO_DOMAIN}"))).all()
    org_ids = {
        m.organization_id
        for m in db.scalars(
            select(Membership).where(Membership.user_id.in_([u.id for u in users] or [""]))
        ).all()
    }
    if not org_ids:
        return 0

    factory_ids = [
        f.id for f in db.scalars(
            select(Factory).where(Factory.organization_id.in_(org_ids))
        ).all()
    ]
    provider_ids = [
        p.id for p in db.scalars(
            select(Provider).where(Provider.organization_id.in_(org_ids))
        ).all()
    ]
    rfq_ids = [
        r.id for r in db.scalars(select(RFQ).where(RFQ.factory_id.in_(factory_ids or [""]))).all()
    ]

    from app.models.governance import AuditLog, ComplianceCase, CorrectiveAction, Event, Notification
    from app.models.identity import RefreshToken

    case_ids = [
        c.id for c in db.scalars(select(ComplianceCase).where(ComplianceCase.factory_id.in_(factory_ids or [""]))).all()
    ]

    user_ids = [u.id for u in users]

    # Order matters: children before parents, and anything pointing at a user
    # before the users themselves. Signing in creates refresh tokens and audit
    # rows with no organization, which is what made an earlier version of this
    # fail with a foreign-key error the moment anyone had used the demo.
    for model, column, values in (
        (ImplementationJob, ImplementationJob.rfq_id, rfq_ids),
        (ImplementationJob, ImplementationJob.provider_id, provider_ids),
        (Quote, Quote.rfq_id, rfq_ids),
        (Quote, Quote.provider_id, provider_ids),
        (RFQInvite, RFQInvite.rfq_id, rfq_ids),
        (RFQInvite, RFQInvite.provider_id, provider_ids),
        (RFQ, RFQ.id, rfq_ids),
        (MaterialListing, MaterialListing.provider_id, provider_ids),
        (ProviderService, ProviderService.provider_id, provider_ids),
        (Provider, Provider.id, provider_ids),
        (CorrectiveAction, CorrectiveAction.case_id, case_ids),
        (ComplianceCase, ComplianceCase.factory_id, factory_ids),
        (Action, Action.factory_id, factory_ids),
        (Assessment, Assessment.factory_id, factory_ids),
        (ActivityRecord, ActivityRecord.factory_id, factory_ids),
        (FactoryProfile, FactoryProfile.factory_id, factory_ids),
        (FactorySite, FactorySite.factory_id, factory_ids),
        (FactoryAccess, FactoryAccess.factory_id, factory_ids),
        (FactoryAccess, FactoryAccess.user_id, user_ids),
        (Notification, Notification.organization_id, list(org_ids)),
        (Notification, Notification.user_id, user_ids),
        (Event, Event.organization_id, list(org_ids)),
        (Event, Event.actor_user_id, user_ids),
        (AuditLog, AuditLog.organization_id, list(org_ids)),
        (AuditLog, AuditLog.actor_user_id, user_ids),
        (RefreshToken, RefreshToken.user_id, user_ids),
        (Factory, Factory.id, factory_ids),
    ):
        if values:
            for row in db.scalars(select(model).where(column.in_(values))).all():
                db.delete(row)
            db.flush()

    for membership in db.scalars(
        select(Membership).where(Membership.organization_id.in_(org_ids))
    ).all():
        db.delete(membership)
    db.flush()
    for user in users:
        db.delete(user)
    for org in db.scalars(select(Organization).where(Organization.id.in_(org_ids))).all():
        db.delete(org)
    db.commit()
    return len(org_ids)


def seed(db) -> dict[str, str]:
    created: dict[str, str] = {}
    orgs: dict[str, Organization] = {}
    users: dict[str, User] = {}

    for slug, org_name, kind, role, full_name in ACCOUNTS:
        org = Organization(name=org_name, kind=kind, state="Gujarat")
        user = User(email=_email(slug), full_name=full_name,
                    password_hash=hash_password(DEMO_PASSWORD))
        db.add_all([org, user])
        db.flush()
        db.add(Membership(user_id=user.id, organization_id=org.id, role=role, is_default=True))
        orgs[slug] = org
        users[slug] = user
        created[slug] = user.email

    owner_org = orgs["owner"]
    today = dt.date.today()
    period_start = today.replace(year=today.year - 1)

    hero_factory_id = None
    hero_action = None

    for (key, name, sector, state, district, lat, lon, output_t, revenue_cr,
         employees, tariff, eu_pct, rows) in FACTORIES:
        factory = Factory(
            organization_id=owner_org.id, name=name, sector=sector, state=state,
            district=district, latitude=lat, longitude=lon,
        )
        db.add(factory)
        db.flush()
        db.add(FactorySite(factory_id=factory.id, name=f"{name} - main site",
                           state=state, district=district, latitude=lat, longitude=lon,
                           is_primary=True))

        profile = FactoryProfile(
            factory_id=factory.id, label=f"FY {period_start.year}-{today.year}",
            period_start=period_start, period_end=today,
            annual_output_t=output_t, annual_revenue_cr=revenue_cr, employees=employees,
            tariff_inr_per_kwh=tariff, eu_export_share_pct=eu_pct,
            export_share_pct=max(eu_pct, 30.0 if eu_pct else 0.0),
            operating_days=300, shifts_per_day=2, is_draft=False,
        )
        db.add(profile)
        db.flush()

        for stream_kind, factor_key, label, quantity, unit, unit_cost in rows:
            db.add(ActivityRecord(
                factory_id=factory.id, profile_id=profile.id, stream_kind=stream_kind,
                factor_key=factor_key, label=label, quantity=quantity, unit=unit,
                period_start=period_start, period_end=today,
                data_state="DECLARED", source_kind="import", unit_cost_inr=unit_cost,
            ))
        db.flush()

        assessment = run_assessment(db, factory, profile, actor_user_id=users["owner"].id,
                                    label="Seeded baseline")
        from app.api.routes_assessments import sync_actions

        sync_actions(db, assessment)
        db.flush()

        if key == "hero":
            hero_factory_id = factory.id
            hero_action = db.scalar(
                select(Action).where(Action.factory_id == factory.id,
                                     Action.was_blocked.is_(False))
                .order_by(Action.expected_payback_yrs.asc().nulls_last()).limit(1)
            )
            # The compliance officer is given exactly this factory, which is how
            # a consultant reaches a client without a seat in their tenant.
            db.add(FactoryAccess(
                user_id=users["compliance"].id, factory_id=factory.id, level="read",
                granted_by_user_id=users["owner"].id,
            ))

    # --- marketplace: providers, services, materials, RFQs, quotes ----------
    marketplace_created = seed_marketplace(db, hero_factory_id, users["owner"], owner_org)
    created.update(marketplace_created)

    # Drain the outbox so the demo opens with real alerts rather than an empty
    # notification centre. In a running deployment the worker process does this;
    # for a demo on one laptop, nobody should have to remember to start it.
    from app.workers.outbox import process_once

    while process_once():
        pass

    return created


def seed_marketplace(db, hero_factory_id: str | None = None, owner_user: User | None = None,
                     owner_org: Organization | None = None) -> dict[str, str]:
    """Idempotently seed or refresh all marketplace providers, services, materials, RFQs, and quotes.
    Can be run multiple times safely.
    """
    today = dt.date.today()
    created_providers: dict[str, str] = {}
    provider_rows: dict[str, Provider] = {}

    for spec in PROVIDERS:
        email = _email(spec["slug"])
        org = db.scalar(select(Organization).where(Organization.name == spec["name"]))
        if org is None:
            org = Organization(name=spec["name"], kind="provider", state=spec["state"])
            db.add(org)
            db.flush()

        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(email=email, full_name=f"{spec['name']} desk",
                        password_hash=hash_password(DEMO_PASSWORD))
            db.add(user)
            db.flush()
        else:
            user.full_name = f"{spec['name']} desk"
            user.password_hash = hash_password(DEMO_PASSWORD)

        membership = db.scalar(
            select(Membership).where(
                Membership.user_id == user.id, Membership.organization_id == org.id
            )
        )
        if membership is None:
            db.add(Membership(user_id=user.id, organization_id=org.id,
                              role=ROLE_PROVIDER_USER, is_default=True))

        created_providers[spec["slug"]] = user.email

        provider = db.scalar(select(Provider).where(Provider.organization_id == org.id))
        if provider is None:
            provider = Provider(
                organization_id=org.id, name=spec["name"], provider_type=spec["provider_type"],
                state=spec["state"], district=spec["district"],
                latitude=spec["lat"], longitude=spec["lon"],
                service_states=spec["service_states"], certifications=spec["certifications"],
                verification_status=spec["verification_status"],
                verified_at=utcnow() if spec["verification_status"] == "verified" else None,
                rating=spec["rating"], rating_count=spec["rating_count"],
                typical_lead_time_days=spec["lead_time"], is_demo_seed=True,
            )
            db.add(provider)
            db.flush()
        else:
            provider.name = spec["name"]
            provider.provider_type = spec["provider_type"]
            provider.state = spec["state"]
            provider.district = spec["district"]
            provider.latitude = spec["lat"]
            provider.longitude = spec["lon"]
            provider.service_states = spec["service_states"]
            provider.certifications = spec["certifications"]
            provider.verification_status = spec["verification_status"]
            provider.verified_at = utcnow() if spec["verification_status"] == "verified" else None
            provider.rating = spec["rating"]
            provider.rating_count = spec["rating_count"]
            provider.typical_lead_time_days = spec["lead_time"]
            provider.is_demo_seed = True
            db.flush()

        provider_rows[spec["slug"]] = provider

        # Clear existing seeded services & materials for clean idempotent refresh
        for existing_svc in db.scalars(
            select(ProviderService).where(ProviderService.provider_id == provider.id)
        ).all():
            db.delete(existing_svc)
        for existing_mat in db.scalars(
            select(MaterialListing).where(MaterialListing.provider_id == provider.id)
        ).all():
            db.delete(existing_mat)
        db.flush()

        for service in spec["services"]:
            db.add(ProviderService(provider_id=provider.id, **service))
        for listing in spec.get("materials", []):
            db.add(MaterialListing(provider_id=provider.id, state=spec["state"],
                                   is_demo_seed=True, **listing))

    db.flush()

    # --- Seed RFQs and Quotes across multiple stages ---
    if hero_factory_id and owner_user and owner_org:
        actions = db.scalars(
            select(Action).where(Action.factory_id == hero_factory_id, Action.was_blocked.is_(False))
            .order_by(Action.expected_payback_yrs.asc().nulls_last())
        ).all()

        if actions:
            from app.services.provider_match import recompute_economics

            # 1. QUOTED RFQ with 3 competitive quotes (for side-by-side comparison)
            hero_action = actions[0]
            rfq1_title = f"{hero_action.name} - Rajkot Metal Works"
            rfq1 = db.scalar(select(RFQ).where(RFQ.factory_id == hero_factory_id, RFQ.title == rfq1_title))
            if rfq1 is None:
                rfq1 = RFQ(
                    organization_id=owner_org.id, factory_id=hero_factory_id,
                    action_id=hero_action.id, created_by_user_id=owner_user.id,
                    intervention_id=hero_action.intervention_id,
                    title=rfq1_title,
                    scope_of_work="Supply, install and commission with complete baseline energy audit and commissioning verification report.",
                    shared_context={
                        "sector": "foundry_casting", "state": "Gujarat", "district": "Rajkot",
                        "intervention_id": hero_action.intervention_id,
                        "target_stream": hero_action.target_stream,
                        "indicative_capex_inr": hero_action.expected_capex_inr,
                        "expected_abatement_tco2e": hero_action.expected_abatement_tco2e,
                    },
                    status="QUOTED", needed_by=today + dt.timedelta(days=90),
                )
                db.add(rfq1)
                db.flush()

                base = hero_action.expected_capex_inr or 500_000
                quotes = [
                    ("gujarat-energy", base * 1.08, True, 24, 30),
                    ("saurashtra-thermal", base * 0.92, False, 12, 55),
                    ("western-recyclers", base * 1.25, True, 36, 21),
                ]
                for slug, price, installed, warranty, days in quotes:
                    prov = provider_rows.get(slug)
                    if not prov:
                        continue
                    db.add(RFQInvite(rfq_id=rfq1.id, provider_id=prov.id, created_at=utcnow()))
                    quote = Quote(
                        rfq_id=rfq1.id, provider_id=prov.id, price_inr=round(price),
                        installation_included=installed, warranty_months=warranty,
                        delivery_days=days, is_demo_seed=True,
                        notes="Seeded competitive commercial quotation.",
                    )
                    quote.comparison = recompute_economics(
                        {
                            "expected_abatement_tco2e": hero_action.expected_abatement_tco2e,
                            "expected_annual_benefit_inr": hero_action.expected_annual_benefit_inr,
                            "expected_capex_inr": hero_action.expected_capex_inr,
                            "lifetime_yrs": (hero_action.engine_snapshot or {}).get("lifetime_yrs", 10),
                        },
                        round(price), None, None,
                    )
                    quote.revised_payback_yrs = quote.comparison.get("payback_yrs")
                    quote.revised_lcoa_inr_per_tco2e = quote.comparison.get("lcoa_inr_per_tco2e")
                    db.add(quote)
                hero_action.status = "RFQ"

            # 2. OPEN RFQ (invited providers, open for incoming quotes)
            if len(actions) > 1:
                action2 = actions[1]
                rfq2_title = f"{action2.name} - Rajkot Metal Works"
                rfq2 = db.scalar(select(RFQ).where(RFQ.factory_id == hero_factory_id, RFQ.title == rfq2_title))
                if rfq2 is None:
                    rfq2 = RFQ(
                        organization_id=owner_org.id, factory_id=hero_factory_id,
                        action_id=action2.id, created_by_user_id=owner_user.id,
                        intervention_id=action2.intervention_id,
                        title=rfq2_title,
                        scope_of_work="Inviting competitive bids for turnkey supply and installation. Bids must include standard manufacturer warranty.",
                        shared_context={
                            "sector": "foundry_casting", "state": "Gujarat", "district": "Rajkot",
                            "intervention_id": action2.intervention_id,
                            "target_stream": action2.target_stream,
                            "indicative_capex_inr": action2.expected_capex_inr,
                            "expected_abatement_tco2e": action2.expected_abatement_tco2e,
                        },
                        status="OPEN", needed_by=today + dt.timedelta(days=60),
                    )
                    db.add(rfq2)
                    db.flush()
                    for slug in ("bharat-clean-tech", "gujarat-energy"):
                        if slug in provider_rows:
                            db.add(RFQInvite(rfq_id=rfq2.id, provider_id=provider_rows[slug].id, created_at=utcnow()))
                    action2.status = "RFQ"

            # 3. ACCEPTED RFQ (already contracted, implementation job scheduled)
            if len(actions) > 2:
                action3 = actions[2]
                rfq3_title = f"{action3.name} - Rajkot Metal Works"
                rfq3 = db.scalar(select(RFQ).where(RFQ.factory_id == hero_factory_id, RFQ.title == rfq3_title))
                if rfq3 is None:
                    rfq3 = RFQ(
                        organization_id=owner_org.id, factory_id=hero_factory_id,
                        action_id=action3.id, created_by_user_id=owner_user.id,
                        intervention_id=action3.intervention_id,
                        title=rfq3_title,
                        scope_of_work="Facility turnkey industrial equipment retrofit with performance warranty.",
                        shared_context={
                            "sector": "foundry_casting", "state": "Gujarat", "district": "Rajkot",
                            "intervention_id": action3.intervention_id,
                            "target_stream": action3.target_stream,
                            "indicative_capex_inr": action3.expected_capex_inr,
                            "expected_abatement_tco2e": action3.expected_abatement_tco2e,
                        },
                        status="ACCEPTED", needed_by=today + dt.timedelta(days=30),
                    )
                    db.add(rfq3)
                    db.flush()

                    prov = provider_rows.get("gujarat-energy")
                    if prov:
                        db.add(RFQInvite(rfq_id=rfq3.id, provider_id=prov.id, created_at=utcnow()))
                        q_price = round((action3.expected_capex_inr or 150_000) * 0.95)
                        accepted_quote = Quote(
                            rfq_id=rfq3.id, provider_id=prov.id, price_inr=q_price,
                            installation_included=True, warranty_months=36,
                            delivery_days=14, is_demo_seed=True, status="ACCEPTED",
                            notes="Accepted competitive bid. Mobilization scheduled.",
                        )
                        accepted_quote.comparison = recompute_economics(
                            {
                                "expected_abatement_tco2e": action3.expected_abatement_tco2e,
                                "expected_annual_benefit_inr": action3.expected_annual_benefit_inr,
                                "expected_capex_inr": action3.expected_capex_inr,
                                "lifetime_yrs": (action3.engine_snapshot or {}).get("lifetime_yrs", 10),
                            },
                            q_price, None, None,
                        )
                        accepted_quote.revised_payback_yrs = accepted_quote.comparison.get("payback_yrs")
                        accepted_quote.revised_lcoa_inr_per_tco2e = accepted_quote.comparison.get("lcoa_inr_per_tco2e")
                        db.add(accepted_quote)
                        db.flush()

                        rfq3.accepted_quote_id = accepted_quote.id
                        action3.status = "APPROVED"

                        db.add(ImplementationJob(
                            quote_id=accepted_quote.id, rfq_id=rfq3.id, factory_id=hero_factory_id,
                            provider_id=prov.id, action_id=action3.id, status="SCHEDULED",
                            scheduled_start=today + dt.timedelta(days=7),
                            scheduled_end=today + dt.timedelta(days=28),
                            provider_notes="Team mobilization scheduled; fixtures in transit.",
                            manufacturer_notes="PO issued and advance payment processed.",
                        ))

    db.commit()
    return created_providers


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the PRANGARA demo dataset")
    parser.add_argument("--reset", action="store_true",
                        help="remove previously seeded rows first")
    parser.add_argument("--force", action="store_true",
                        help="re-run full seeding even if accounts already exist")
    parser.add_argument("--create-tables", action="store_true",
                        help="create tables directly instead of running migrations")
    args = parser.parse_args()

    # Ensure all tables exist before querying
    Base.metadata.create_all(engine)

    with SessionLocal() as db:
        if args.reset:
            removed = wipe(db)
            print(f"removed {removed} seeded organization(s)")
        existing = db.scalar(select(User).where(User.email == _email("owner")))
        if existing is not None and not args.reset and not args.force:
            owner_org = db.scalar(select(Organization).where(Organization.name == "Rajkot Metal Works"))
            hero_factory = db.scalar(select(Factory).where(Factory.name == "Rajkot Metal Works"))
            seed_marketplace(db, hero_factory.id if hero_factory else None, existing, owner_org)
            print("demo data already present - marketplace listings and providers synchronized")
            return
        created = seed(db)

    print("seeded accounts (password: " + DEMO_PASSWORD + ")")
    for slug, email in created.items():
        print(f"  {slug:<25} {email}")


if __name__ == "__main__":
    main()

