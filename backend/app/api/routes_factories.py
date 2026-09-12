"""
Factories, sites, profiles, activity records and assets.

Every handler here resolves its factory through `app.services.access`, which is
what stops one organization reading another's plant. No handler takes an
organization id from the client.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query, status
from sqlalchemy import func, select

from app.api.deps import ClientIp, CurrentPrincipal, DbSession
from app.core.errors import BadRequest, Forbidden, NotFound
from app.models.action import ACTIVE_STATUSES, Action
from app.models.assessment import Assessment
from app.models.base import utcnow
from app.models.factory import ActivityRecord, Asset, Factory, FactoryProfile, FactorySite
from app.schemas.factory import (
    ActivityRecordIn, ActivityRecordOut, AssetIn, AssetOut, FactoryCreate, FactoryOut,
    FactorySummary, FactoryUpdate, ProfileOut, ProfileUpsert, SiteCreate, SiteOut,
)
from app.services import audit, events
from app.services.access import (
    accessible_factory_ids, require_org_write, resolve_factory,
)
from app.services.asset_energy import estimate_asset
from engine import sector_db

router = APIRouter(prefix="/api/factories", tags=["factories"])


def _known_sector(key: str) -> None:
    try:
        sector_db().get(key)
    except KeyError:
        raise BadRequest(
            f"Unknown sector '{key}'. Call GET /api/sectors for the list.",
            "unknown_sector",
        ) from None


@router.get("", response_model=list[FactorySummary])
def list_factories(principal: CurrentPrincipal, db: DbSession,
                   limit: int = Query(default=50, ge=1, le=200),
                   offset: int = Query(default=0, ge=0)) -> list[FactorySummary]:
    ids = accessible_factory_ids(db, principal)
    stmt = select(Factory).where(Factory.archived_at.is_(None))
    if ids is not None:
        if not ids:
            return []
        stmt = stmt.where(Factory.id.in_(ids))
    factories = list(
        db.scalars(stmt.order_by(Factory.created_at.desc()).limit(limit).offset(offset)).all()
    )
    return [_summarise(db, f) for f in factories]


def _summarise(db: DbSession, factory: Factory) -> FactorySummary:
    latest = db.scalar(
        select(Assessment)
        .where(Assessment.factory_id == factory.id, Assessment.is_baseline.is_(True))
        .order_by(Assessment.created_at.desc())
        .limit(1)
    )
    open_actions = db.scalar(
        select(func.count()).select_from(Action).where(
            Action.factory_id == factory.id, Action.status.in_(ACTIVE_STATUSES)
        )
    ) or 0
    summary = FactorySummary.model_validate(factory)
    summary.open_action_count = int(open_actions)
    if latest is not None:
        summary.latest_assessment_id = latest.id
        summary.latest_assessed_at = latest.created_at
        summary.total_tco2e = latest.total_tco2e
        summary.scope3_tco2e = latest.scope3_tco2e
        summary.critical_leak_count = latest.critical_leak_count
        summary.cash_positive_benefit_inr = latest.cash_positive_benefit_inr
        summary.data_quality_score = latest.data_quality_score
    return summary


@router.post("", response_model=FactoryOut, status_code=status.HTTP_201_CREATED)
def create_factory(body: FactoryCreate, principal: CurrentPrincipal, db: DbSession,
                   ip: ClientIp) -> FactoryOut:
    org_id = principal.active_org_id
    if not org_id:
        raise Forbidden("You are not a member of any organization.")
    require_org_write(principal, org_id)
    _known_sector(body.sector)

    factory = Factory(organization_id=org_id, **body.model_dump())
    db.add(factory)
    db.flush()

    # A factory with no profile cannot be assessed, and a user who has to create
    # one by hand before anything works will not. So the first period is created
    # with the factory, as a draft.
    db.add(FactoryProfile(factory_id=factory.id, label="Current period", is_draft=True))

    audit.record(db, action="factory.create", object_type="factory", object_id=factory.id,
                 organization_id=org_id, actor_user_id=principal.user_id,
                 actor_label=principal.user.email, new_value=body.model_dump(), ip_address=ip)
    events.emit(db, events.FACTORY_CREATED, organization_id=org_id, factory_id=factory.id,
                actor_user_id=principal.user_id,
                payload={"name": factory.name, "sector": factory.sector})
    db.commit()
    return FactoryOut.model_validate(factory)


@router.get("/{factory_id}", response_model=FactorySummary)
def get_factory(factory_id: str, principal: CurrentPrincipal, db: DbSession) -> FactorySummary:
    return _summarise(db, resolve_factory(db, principal, factory_id))


@router.patch("/{factory_id}", response_model=FactoryOut)
def update_factory(factory_id: str, body: FactoryUpdate, principal: CurrentPrincipal,
                   db: DbSession, ip: ClientIp) -> FactoryOut:
    factory = resolve_factory(db, principal, factory_id, write=True)
    patch = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    before = {k: getattr(factory, k) for k in patch}
    for key, value in patch.items():
        setattr(factory, key, value)
    # Sector is deliberately absent from FactoryUpdate. Changing it would
    # invalidate every stored assessment's benchmark basis, so it is a new
    # factory, not an edit.
    audit.record(db, action="factory.update", object_type="factory", object_id=factory.id,
                 organization_id=factory.organization_id, actor_user_id=principal.user_id,
                 actor_label=principal.user.email, old_value=before, new_value=patch,
                 ip_address=ip)
    db.commit()
    return FactoryOut.model_validate(factory)


@router.delete("/{factory_id}")
def archive_factory(factory_id: str, principal: CurrentPrincipal, db: DbSession,
                    ip: ClientIp) -> dict[str, bool]:
    factory = resolve_factory(db, principal, factory_id, write=True)
    factory.archived_at = utcnow()
    audit.record(db, action="factory.archive", object_type="factory", object_id=factory.id,
                 organization_id=factory.organization_id, actor_user_id=principal.user_id,
                 actor_label=principal.user.email, ip_address=ip)
    db.commit()
    return {"ok": True}


# --------------------------------------------------------------------------
# sites
# --------------------------------------------------------------------------

@router.get("/{factory_id}/sites", response_model=list[SiteOut])
def list_sites(factory_id: str, principal: CurrentPrincipal, db: DbSession) -> list[SiteOut]:
    resolve_factory(db, principal, factory_id)
    rows = db.scalars(
        select(FactorySite).where(
            FactorySite.factory_id == factory_id, FactorySite.archived_at.is_(None)
        ).order_by(FactorySite.is_primary.desc(), FactorySite.created_at)
    ).all()
    return [SiteOut.model_validate(r) for r in rows]


@router.post("/{factory_id}/sites", response_model=SiteOut, status_code=status.HTTP_201_CREATED)
def create_site(factory_id: str, body: SiteCreate, principal: CurrentPrincipal,
                db: DbSession) -> SiteOut:
    factory = resolve_factory(db, principal, factory_id, write=True)
    if body.is_primary:
        for existing in db.scalars(
            select(FactorySite).where(FactorySite.factory_id == factory_id)
        ).all():
            existing.is_primary = False
    site = FactorySite(factory_id=factory.id, **body.model_dump())
    db.add(site)
    db.commit()
    return SiteOut.model_validate(site)


# --------------------------------------------------------------------------
# profiles
# --------------------------------------------------------------------------

@router.get("/{factory_id}/profiles", response_model=list[ProfileOut])
def list_profiles(factory_id: str, principal: CurrentPrincipal, db: DbSession) -> list[ProfileOut]:
    resolve_factory(db, principal, factory_id)
    rows = db.scalars(
        select(FactoryProfile).where(FactoryProfile.factory_id == factory_id)
        .order_by(FactoryProfile.created_at.desc())
    ).all()
    return [ProfileOut.model_validate(r) for r in rows]


@router.get("/{factory_id}/profile", response_model=ProfileOut)
def current_profile(factory_id: str, principal: CurrentPrincipal, db: DbSession) -> ProfileOut:
    resolve_factory(db, principal, factory_id)
    return ProfileOut.model_validate(_current_profile_row(db, factory_id))


def _current_profile_row(db: DbSession, factory_id: str) -> FactoryProfile:
    profile = db.scalar(
        select(FactoryProfile).where(FactoryProfile.factory_id == factory_id)
        .order_by(FactoryProfile.created_at.desc()).limit(1)
    )
    if profile is None:
        raise NotFound("This factory has no reporting period yet.")
    return profile


@router.put("/{factory_id}/profile", response_model=ProfileOut)
def upsert_profile(factory_id: str, body: ProfileUpsert, principal: CurrentPrincipal,
                   db: DbSession, ip: ClientIp) -> ProfileOut:
    """Update the current reporting period, creating one if none exists.

    Draft saves are the normal case here: the mobile and web forms save
    continuously, and a partial profile is a legitimate state, not an error.
    """
    factory = resolve_factory(db, principal, factory_id, write=True)
    profile = db.scalar(
        select(FactoryProfile).where(FactoryProfile.factory_id == factory_id)
        .order_by(FactoryProfile.created_at.desc()).limit(1)
    )
    patch = body.model_dump(exclude_unset=True)
    if profile is None:
        profile = FactoryProfile(factory_id=factory.id, **patch)
        db.add(profile)
        db.flush()
        before: dict[str, Any] = {}
    else:
        before = {k: getattr(profile, k) for k in patch}
        for key, value in patch.items():
            setattr(profile, key, value)

    audit.record(db, action="factory.profile.upsert", object_type="factory_profile",
                 object_id=profile.id, organization_id=factory.organization_id,
                 actor_user_id=principal.user_id, actor_label=principal.user.email,
                 old_value=before, new_value=patch, ip_address=ip)
    events.emit(db, events.FACTORY_PROFILE_UPDATED, organization_id=factory.organization_id,
                factory_id=factory.id, actor_user_id=principal.user_id,
                payload={"profile_id": profile.id, "is_draft": profile.is_draft})
    db.commit()
    return ProfileOut.model_validate(profile)


# --------------------------------------------------------------------------
# activity records
# --------------------------------------------------------------------------

@router.get("/{factory_id}/activity", response_model=list[ActivityRecordOut])
def list_activity(factory_id: str, principal: CurrentPrincipal, db: DbSession,
                  profile_id: str | None = None) -> list[ActivityRecordOut]:
    resolve_factory(db, principal, factory_id)
    target = profile_id or _current_profile_row(db, factory_id).id
    rows = db.scalars(
        select(ActivityRecord).where(
            ActivityRecord.factory_id == factory_id, ActivityRecord.profile_id == target
        ).order_by(ActivityRecord.stream_kind, ActivityRecord.created_at)
    ).all()
    return [ActivityRecordOut.model_validate(r) for r in rows]


@router.post("/{factory_id}/activity", response_model=ActivityRecordOut,
             status_code=status.HTTP_201_CREATED)
def add_activity(factory_id: str, body: ActivityRecordIn, principal: CurrentPrincipal,
                 db: DbSession, ip: ClientIp,
                 profile_id: str | None = None) -> ActivityRecordOut:
    factory = resolve_factory(db, principal, factory_id, write=True)
    profile = db.get(FactoryProfile, profile_id) if profile_id \
        else _current_profile_row(db, factory_id)
    if profile is None or profile.factory_id != factory_id:
        raise NotFound("Reporting period not found for this factory.")

    if body.client_ref:
        existing = db.scalar(
            select(ActivityRecord).where(
                ActivityRecord.factory_id == factory.id,
                ActivityRecord.client_ref == body.client_ref,
            )
        )
        if existing is not None:
            return ActivityRecordOut.model_validate(existing)

    record = ActivityRecord(factory_id=factory.id, profile_id=profile.id, **body.model_dump())
    db.add(record)
    db.flush()
    audit.record(db, action="activity.create", object_type="activity_record",
                 object_id=record.id, organization_id=factory.organization_id,
                 actor_user_id=principal.user_id, actor_label=principal.user.email,
                 new_value=body.model_dump(), ip_address=ip)
    events.emit(db, events.ACTIVITY_RECORD_ADDED, organization_id=factory.organization_id,
                factory_id=factory.id, actor_user_id=principal.user_id,
                payload={"activity_record_id": record.id, "stream_kind": record.stream_kind})
    db.commit()
    return ActivityRecordOut.model_validate(record)


@router.patch("/{factory_id}/activity/{record_id}", response_model=ActivityRecordOut)
def update_activity(factory_id: str, record_id: str, body: ActivityRecordIn,
                    principal: CurrentPrincipal, db: DbSession, ip: ClientIp,
                    reason: str | None = None) -> ActivityRecordOut:
    factory = resolve_factory(db, principal, factory_id, write=True)
    record = db.get(ActivityRecord, record_id)
    if record is None or record.factory_id != factory_id:
        raise NotFound("Activity record not found.")

    patch = body.model_dump(exclude_unset=True)
    before = {k: getattr(record, k) for k in patch}
    for key, value in patch.items():
        setattr(record, key, value)
    # A user correcting an extracted value is the signal that matters most for
    # improving extraction, so a correction is its own event, not a generic
    # update.
    correcting = record.source_kind in ("document_ocr", "conversation", "equipment_scan")
    if correcting:
        record.confirmed_by_user_id = principal.user_id
        record.confirmed_at = utcnow()

    audit.record(db, action="activity.update", object_type="activity_record",
                 object_id=record.id, organization_id=factory.organization_id,
                 actor_user_id=principal.user_id, actor_label=principal.user.email,
                 old_value=before, new_value=patch, reason=reason, ip_address=ip)
    events.emit(db, events.ACTIVITY_RECORD_CORRECTED if correcting else events.ACTIVITY_RECORD_ADDED,
                organization_id=factory.organization_id, factory_id=factory.id,
                actor_user_id=principal.user_id,
                payload={"activity_record_id": record.id, "changed": sorted(patch)})
    db.commit()
    return ActivityRecordOut.model_validate(record)


@router.delete("/{factory_id}/activity/{record_id}")
def delete_activity(factory_id: str, record_id: str, principal: CurrentPrincipal,
                    db: DbSession, ip: ClientIp) -> dict[str, bool]:
    factory = resolve_factory(db, principal, factory_id, write=True)
    record = db.get(ActivityRecord, record_id)
    if record is None or record.factory_id != factory_id:
        raise NotFound("Activity record not found.")
    audit.record(db, action="activity.delete", object_type="activity_record",
                 object_id=record.id, organization_id=factory.organization_id,
                 actor_user_id=principal.user_id, actor_label=principal.user.email,
                 old_value={"quantity": record.quantity, "unit": record.unit,
                            "factor_key": record.factor_key}, ip_address=ip)
    db.delete(record)
    db.commit()
    return {"ok": True}


# --------------------------------------------------------------------------
# assets
# --------------------------------------------------------------------------

@router.get("/{factory_id}/assets", response_model=list[AssetOut])
def list_assets(factory_id: str, principal: CurrentPrincipal, db: DbSession) -> list[AssetOut]:
    resolve_factory(db, principal, factory_id)
    rows = db.scalars(
        select(Asset).where(Asset.factory_id == factory_id, Asset.archived_at.is_(None))
        .order_by(Asset.created_at.desc())
    ).all()
    return [AssetOut.model_validate(r) for r in rows]


@router.post("/{factory_id}/assets", response_model=AssetOut, status_code=status.HTTP_201_CREATED)
def add_asset(factory_id: str, body: AssetIn, principal: CurrentPrincipal, db: DbSession,
              ip: ClientIp) -> AssetOut:
    factory = resolve_factory(db, principal, factory_id, write=True)
    asset = Asset(factory_id=factory.id, **body.model_dump())
    estimate_asset(asset, factory)
    db.add(asset)
    db.flush()
    audit.record(db, action="asset.create", object_type="asset", object_id=asset.id,
                 organization_id=factory.organization_id, actor_user_id=principal.user_id,
                 actor_label=principal.user.email, new_value=body.model_dump(), ip_address=ip)
    events.emit(db, events.ASSET_REGISTERED, organization_id=factory.organization_id,
                factory_id=factory.id, actor_user_id=principal.user_id,
                payload={"asset_id": asset.id, "asset_type": asset.asset_type})
    db.commit()
    return AssetOut.model_validate(asset)


@router.patch("/{factory_id}/assets/{asset_id}", response_model=AssetOut)
def update_asset(factory_id: str, asset_id: str, body: AssetIn, principal: CurrentPrincipal,
                 db: DbSession) -> AssetOut:
    factory = resolve_factory(db, principal, factory_id, write=True)
    asset = db.get(Asset, asset_id)
    if asset is None or asset.factory_id != factory_id:
        raise NotFound("Asset not found.")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(asset, key, value)
    estimate_asset(asset, factory)
    db.commit()
    return AssetOut.model_validate(asset)
