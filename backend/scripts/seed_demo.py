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
    MaterialListing, Provider, ProviderService, Quote, RFQ, RFQInvite,
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
        "service_states": ["Gujarat", "Maharashtra"],
        "certifications": ["BEE Certified Energy Auditor"],
        "verification_status": "verified", "rating": 4.4, "rating_count": 18,
        "lead_time": 21,
        "services": [
            {"category": "energy", "name": "VFD and motor retrofit",
             "intervention_ids": ["VFD_RETROFIT", "MOTOR_IE3_UPGRADE"],
             "indicative_price_inr": 480_000, "price_basis": "per installation",
             "warranty_months": 24, "lead_time_days": 21},
            {"category": "energy", "name": "Compressed air leak survey and repair",
             "intervention_ids": ["AIR_LEAK_FIX"],
             "indicative_price_inr": 180_000, "price_basis": "per survey",
             "warranty_months": 12, "lead_time_days": 10},
        ],
    },
    {
        "slug": "saurashtra-thermal",
        "name": "Saurashtra Thermal Solutions",
        "provider_type": "esco",
        "state": "Gujarat", "district": "Rajkot", "lat": 22.28, "lon": 70.77,
        "service_states": ["Gujarat"],
        "certifications": ["ISO 50001 implementation partner"],
        "verification_status": "verified", "rating": 4.1, "rating_count": 11,
        "lead_time": 45,
        "services": [
            {"category": "energy", "name": "Waste heat recovery on furnace exhaust",
             "intervention_ids": ["WASTE_HEAT_RECOVERY", "BOILER_ECONOMISER"],
             "indicative_price_inr": 2_600_000, "price_basis": "per system",
             "warranty_months": 36, "lead_time_days": 60},
        ],
    },
    {
        "slug": "western-recyclers",
        "name": "Western Recyclers Pvt Ltd",
        "provider_type": "recycled_material_supplier",
        "state": "Gujarat", "district": "Ahmedabad", "lat": 23.02, "lon": 72.57,
        "service_states": ["Gujarat", "Rajasthan", "Maharashtra"],
        "certifications": ["GRS Certified"],
        "verification_status": "pending", "rating": 3.9, "rating_count": 6,
        "lead_time": 14,
        "services": [
            {"category": "material", "name": "Recycled PET and steel scrap supply",
             "intervention_ids": ["RPET_SUB", "STEEL_SCRAP_SUB"],
             "indicative_price_inr": None, "price_basis": "per tonne",
             "warranty_months": None, "lead_time_days": 14},
        ],
        "materials": [
            {"name": "Food-grade rPET flake", "material_key": "PET_RECYCLED",
             "grade": "FG-100", "recycled_content_pct": 100.0,
             "embodied_factor_key": "PET_RECYCLED", "embodied_tco2e_per_t": 1.4,
             "embodied_source": "PRANGARA reference registry (PET_RECYCLED)",
             "price_inr_per_t": 78_000, "moq_t": 5, "stock_t": 240,
             "certifications": ["GRS"]},
            {"name": "Sorted shredded steel scrap", "material_key": "STEEL_SECONDARY",
             "grade": "HMS 1", "recycled_content_pct": 100.0,
             "embodied_factor_key": "STEEL_SECONDARY", "embodied_tco2e_per_t": 0.7,
             "embodied_source": "PRANGARA reference registry (STEEL_SECONDARY)",
             "price_inr_per_t": 39_500, "moq_t": 20, "stock_t": 900,
             "certifications": []},
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
        (Quote, Quote.rfq_id, rfq_ids),
        (RFQInvite, RFQInvite.rfq_id, rfq_ids),
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

    # --- providers ----------------------------------------------------------
    provider_rows: dict[str, Provider] = {}
    for spec in PROVIDERS:
        org = Organization(name=spec["name"], kind="provider", state=spec["state"])
        user = User(email=_email(spec["slug"]), full_name=f"{spec['name']} desk",
                    password_hash=hash_password(DEMO_PASSWORD))
        db.add_all([org, user])
        db.flush()
        db.add(Membership(user_id=user.id, organization_id=org.id,
                          role=ROLE_PROVIDER_USER, is_default=True))
        created[spec["slug"]] = user.email

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
        provider_rows[spec["slug"]] = provider

        for service in spec["services"]:
            db.add(ProviderService(provider_id=provider.id, **service))
        for listing in spec.get("materials", []):
            db.add(MaterialListing(provider_id=provider.id, state=spec["state"],
                                   is_demo_seed=True, **listing))
    db.flush()

    # --- one RFQ with competing quotes --------------------------------------
    if hero_factory_id and hero_action is not None:
        rfq = RFQ(
            organization_id=owner_org.id, factory_id=hero_factory_id,
            action_id=hero_action.id, created_by_user_id=users["owner"].id,
            intervention_id=hero_action.intervention_id,
            title=f"{hero_action.name} - Rajkot Metal Works",
            scope_of_work="Supply, install and commission. Include commissioning report.",
            shared_context={
                "sector": "foundry_casting", "state": "Gujarat", "district": "Rajkot",
                "intervention_id": hero_action.intervention_id,
                "target_stream": hero_action.target_stream,
                "indicative_capex_inr": hero_action.expected_capex_inr,
                "expected_abatement_tco2e": hero_action.expected_abatement_tco2e,
            },
            status="QUOTED", needed_by=today + dt.timedelta(days=90),
        )
        db.add(rfq)
        db.flush()

        base = hero_action.expected_capex_inr or 500_000
        quotes = [
            ("gujarat-energy", base * 1.08, True, 24, 30),
            ("saurashtra-thermal", base * 0.92, False, 12, 55),
            ("western-recyclers", base * 1.25, True, 36, 21),
        ]
        from app.services.provider_match import recompute_economics

        for slug, price, installed, warranty, days in quotes:
            provider = provider_rows[slug]
            db.add(RFQInvite(rfq_id=rfq.id, provider_id=provider.id, created_at=utcnow()))
            quote = Quote(
                rfq_id=rfq.id, provider_id=provider.id, price_inr=round(price),
                installation_included=installed, warranty_months=warranty,
                delivery_days=days, is_demo_seed=True,
                notes="Seeded demo quote - not a real commercial offer.",
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

    db.commit()

    # Drain the outbox so the demo opens with real alerts rather than an empty
    # notification centre. In a running deployment the worker process does this;
    # for a demo on one laptop, nobody should have to remember to start it.
    from app.workers.outbox import process_once

    while process_once():
        pass

    return created


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the PRANGARA demo dataset")
    parser.add_argument("--reset", action="store_true",
                        help="remove previously seeded rows first")
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
        if existing is not None:
            print("demo data already present - pass --reset to rebuild it")
            return
        created = seed(db)

    print("seeded accounts (password: " + DEMO_PASSWORD + ")")
    for slug, email in created.items():
        print(f"  {slug:<20} {email}")


if __name__ == "__main__":
    main()
