"""
Marketplace: provider directory, matching, RFQs, quotes, material listings.

The access boundary that shapes every handler here (PRD FR-01): a provider sees
an RFQ only through an invite row addressed to its own provider profile, and
never sees the assessment behind it. A manufacturer sees quotes on its own RFQs
and never another factory's.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query, status
from sqlalchemy import func, select

from app.api.deps import ClientIp, CurrentPrincipal, DbSession
from app.core.errors import BadRequest, Conflict, Forbidden, NotFound
from app.models.action import Action
from app.models.base import utcnow
from app.models.factory import Factory
from app.models.identity import ORG_PROVIDER
from app.models.marketplace import (
    ImplementationJob, MaterialListing, Provider, ProviderService, Quote, RFQ, RFQInvite,
)
from app.schemas.marketplace import (
    MaterialListingIn, MaterialListingOut, ProviderCreate, ProviderMatch, ProviderOut,
    ProviderServiceIn, ProviderServiceOut, QuoteComparison, QuoteCreate, QuoteOut,
    RFQCreate, RFQOut,
)
from app.services import audit, events
from app.services.access import require_platform_admin, require_provider, resolve_factory
from app.services.provider_match import match_providers, recompute_economics

router = APIRouter(prefix="/api", tags=["marketplace"])


# --------------------------------------------------------------------------
# providers
# --------------------------------------------------------------------------

@router.post("/providers", response_model=ProviderOut, status_code=status.HTTP_201_CREATED)
def create_provider(body: ProviderCreate, principal: CurrentPrincipal, db: DbSession,
                    ip: ClientIp) -> ProviderOut:
    org_id = principal.active_org_id
    org = principal.organizations.get(org_id or "")
    if org is None:
        raise Forbidden("You are not a member of any organization.")
    if org.kind != ORG_PROVIDER:
        raise BadRequest(
            "Only a provider organization can register a provider profile. "
            "Register with organization_kind='provider'.",
            "not_a_provider_org",
        )
    if db.scalar(select(Provider).where(Provider.organization_id == org.id)) is not None:
        raise Conflict("This organization already has a provider profile.", "provider_exists")

    provider = Provider(organization_id=org.id, **body.model_dump())
    db.add(provider)
    db.flush()
    audit.record(db, action="provider.create", object_type="provider", object_id=provider.id,
                 organization_id=org.id, actor_user_id=principal.user_id,
                 actor_label=principal.user.email, new_value=body.model_dump(), ip_address=ip)
    db.commit()
    return ProviderOut.model_validate(provider)


@router.get("/providers", response_model=list[ProviderOut])
def list_providers(db: DbSession, provider_type: str | None = None,
                   state: str | None = None, verified_only: bool = False,
                   limit: int = Query(default=50, ge=1, le=200)) -> list[ProviderOut]:
    """Public directory.

    Deliberately readable without a factory: a manufacturer evaluating the
    platform should be able to see whether anyone near them can actually do the
    work before signing up.
    """
    stmt = select(Provider).where(Provider.archived_at.is_(None))
    if provider_type:
        stmt = stmt.where(Provider.provider_type == provider_type)
    if state:
        stmt = stmt.where(Provider.state == state)
    if verified_only:
        stmt = stmt.where(Provider.verification_status == "verified")
    rows = db.scalars(stmt.order_by(Provider.name).limit(limit)).all()
    return [ProviderOut.model_validate(r) for r in rows]


@router.get("/providers/match", response_model=list[ProviderMatch])
def match(factory_id: str, intervention_id: str, principal: CurrentPrincipal,
          db: DbSession, limit: int = Query(default=10, ge=1, le=50)) -> list[ProviderMatch]:
    factory = resolve_factory(db, principal, factory_id)
    return [
        ProviderMatch(
            provider=ProviderOut.model_validate(m["provider"]),
            score=m["score"], reasons=m["reasons"], distance_km=m["distance_km"],
            indicative_price_inr=m["indicative_price_inr"],
            matched_service_id=m["matched_service_id"],
        )
        for m in match_providers(db, factory, intervention_id, limit)
    ]


@router.get("/providers/{provider_id}", response_model=ProviderOut)
def get_provider(provider_id: str, db: DbSession) -> ProviderOut:
    provider = db.get(Provider, provider_id)
    if provider is None or provider.archived_at is not None:
        raise NotFound("Provider not found.")
    return ProviderOut.model_validate(provider)


@router.post("/providers/{provider_id}/services", response_model=ProviderServiceOut,
             status_code=status.HTTP_201_CREATED)
def add_service(provider_id: str, body: ProviderServiceIn, principal: CurrentPrincipal,
                db: DbSession) -> ProviderServiceOut:
    provider = require_provider(db, principal)
    if provider.id != provider_id:
        raise Forbidden("You can only add services to your own provider profile.")
    service = ProviderService(provider_id=provider.id, **body.model_dump())
    db.add(service)
    db.commit()
    return ProviderServiceOut.model_validate(service)


@router.get("/providers/{provider_id}/services", response_model=list[ProviderServiceOut])
def list_services(provider_id: str, db: DbSession) -> list[ProviderServiceOut]:
    rows = db.scalars(
        select(ProviderService).where(
            ProviderService.provider_id == provider_id, ProviderService.is_active.is_(True)
        )
    ).all()
    return [ProviderServiceOut.model_validate(r) for r in rows]


@router.post("/providers/{provider_id}/verify", response_model=ProviderOut)
def verify_provider(provider_id: str, principal: CurrentPrincipal, db: DbSession,
                    ip: ClientIp) -> ProviderOut:
    """Verification is a human decision (AI_AGENT_PLAYBOOK section 17)."""
    require_platform_admin(principal)
    provider = db.get(Provider, provider_id)
    if provider is None:
        raise NotFound("Provider not found.")
    provider.verification_status = "verified"
    provider.verified_by_user_id = principal.user_id
    provider.verified_at = utcnow()
    audit.record(db, action="provider.verify", object_type="provider", object_id=provider.id,
                 organization_id=provider.organization_id, actor_user_id=principal.user_id,
                 actor_label=principal.user.email, ip_address=ip,
                 new_value={"verification_status": "verified"})
    db.commit()
    return ProviderOut.model_validate(provider)


# --------------------------------------------------------------------------
# RFQs
# --------------------------------------------------------------------------

def _rfq_out(db: DbSession, rfq: RFQ) -> RFQOut:
    invites = db.scalars(select(RFQInvite.provider_id).where(RFQInvite.rfq_id == rfq.id)).all()
    count = db.scalar(
        select(func.count()).select_from(Quote).where(Quote.rfq_id == rfq.id)
    ) or 0
    out = RFQOut.model_validate(rfq)
    out.invited_provider_ids = list(invites)
    out.quote_count = int(count)
    return out


@router.post("/rfqs", response_model=RFQOut, status_code=status.HTTP_201_CREATED)
def create_rfq(body: RFQCreate, principal: CurrentPrincipal, db: DbSession,
               ip: ClientIp) -> RFQOut:
    factory = resolve_factory(db, principal, body.factory_id, write=True)

    action = None
    if body.action_id:
        action = db.get(Action, body.action_id)
        if action is None or action.factory_id != factory.id:
            raise NotFound("Action not found for this factory.")

    # What the provider is allowed to see. A copy, not a reference - see the
    # module docstring of app/models/marketplace.py.
    shared_context: dict[str, Any] = {
        "sector": factory.sector,
        "state": factory.state,
        "district": factory.district,
        "intervention_id": body.intervention_id,
    }
    if action is not None:
        shared_context.update({
            "target_stream": action.target_stream,
            "indicative_capex_inr": action.expected_capex_inr,
            "expected_abatement_tco2e": action.expected_abatement_tco2e,
        })

    rfq = RFQ(
        organization_id=factory.organization_id,
        factory_id=factory.id,
        action_id=action.id if action else None,
        created_by_user_id=principal.user_id,
        intervention_id=body.intervention_id,
        title=body.title,
        scope_of_work=body.scope_of_work,
        shared_context=shared_context,
        status="OPEN" if body.provider_ids else "DRAFT",
        needed_by=body.needed_by,
    )
    db.add(rfq)
    db.flush()

    now = utcnow()
    for provider_id in body.provider_ids:
        provider = db.get(Provider, provider_id)
        if provider is None or provider.archived_at is not None:
            raise NotFound(f"Provider '{provider_id}' not found.")
        db.add(RFQInvite(rfq_id=rfq.id, provider_id=provider.id, created_at=now))

    if action is not None and action.status in ("PROPOSED", "SELECTED"):
        action.status = "RFQ"

    audit.record(db, action="rfq.create", object_type="rfq", object_id=rfq.id,
                 organization_id=factory.organization_id, actor_user_id=principal.user_id,
                 actor_label=principal.user.email, ip_address=ip,
                 new_value={"intervention_id": rfq.intervention_id,
                            "providers": body.provider_ids})
    events.emit(db, events.RFQ_CREATED, organization_id=factory.organization_id,
                factory_id=factory.id, actor_user_id=principal.user_id, correlation_id=rfq.id,
                payload={"rfq_id": rfq.id, "intervention_id": rfq.intervention_id,
                         "provider_ids": body.provider_ids})
    db.commit()
    return _rfq_out(db, rfq)


@router.get("/rfqs", response_model=list[RFQOut])
def list_rfqs(principal: CurrentPrincipal, db: DbSession,
              factory_id: str | None = None) -> list[RFQOut]:
    """A manufacturer's own RFQs, or - for a provider - the ones it was invited to."""
    if principal.is_provider:
        provider = require_provider(db, principal)
        rfq_ids = db.scalars(
            select(RFQInvite.rfq_id).where(RFQInvite.provider_id == provider.id)
        ).all()
        if not rfq_ids:
            return []
        rows = db.scalars(
            select(RFQ).where(RFQ.id.in_(rfq_ids)).order_by(RFQ.created_at.desc())
        ).all()
        return [_rfq_out(db, r) for r in rows]

    if factory_id:
        resolve_factory(db, principal, factory_id)
        stmt = select(RFQ).where(RFQ.factory_id == factory_id)
    else:
        if not principal.org_ids:
            return []
        stmt = select(RFQ).where(RFQ.organization_id.in_(principal.org_ids))
    rows = db.scalars(stmt.order_by(RFQ.created_at.desc())).all()
    return [_rfq_out(db, r) for r in rows]


def _rfq_for_principal(db: DbSession, principal: CurrentPrincipal, rfq_id: str,
                       write: bool = False) -> RFQ:
    rfq = db.get(RFQ, rfq_id)
    if rfq is None:
        raise NotFound("RFQ not found.")
    resolve_factory(db, principal, rfq.factory_id, write=write)
    return rfq


@router.get("/rfqs/{rfq_id}", response_model=RFQOut)
def get_rfq(rfq_id: str, principal: CurrentPrincipal, db: DbSession) -> RFQOut:
    rfq = db.get(RFQ, rfq_id)
    if rfq is None:
        raise NotFound("RFQ not found.")
    if principal.is_provider:
        provider = require_provider(db, principal)
        invite = db.scalar(
            select(RFQInvite).where(RFQInvite.rfq_id == rfq.id,
                                    RFQInvite.provider_id == provider.id)
        )
        if invite is None:
            raise NotFound("RFQ not found.")
        if invite.viewed_at is None:
            invite.viewed_at = utcnow()
            db.commit()
        return _rfq_out(db, rfq)
    resolve_factory(db, principal, rfq.factory_id)
    return _rfq_out(db, rfq)


@router.post("/rfqs/{rfq_id}/quotes", response_model=QuoteOut,
             status_code=status.HTTP_201_CREATED)
def submit_quote(rfq_id: str, body: QuoteCreate, principal: CurrentPrincipal,
                 db: DbSession) -> QuoteOut:
    provider = require_provider(db, principal)
    rfq = db.get(RFQ, rfq_id)
    if rfq is None:
        raise NotFound("RFQ not found.")
    invite = db.scalar(
        select(RFQInvite).where(RFQInvite.rfq_id == rfq.id, RFQInvite.provider_id == provider.id)
    )
    if invite is None:
        raise NotFound("RFQ not found.")
    if rfq.status in ("ACCEPTED", "COMPLETED", "REJECTED"):
        raise Conflict(f"This RFQ is {rfq.status.lower()} and no longer accepts quotes.",
                       "rfq_closed")
    if db.scalar(select(Quote).where(Quote.rfq_id == rfq.id, Quote.provider_id == provider.id)):
        raise Conflict("You have already quoted on this RFQ.", "quote_exists")

    quote = Quote(rfq_id=rfq.id, provider_id=provider.id,
                  submitted_by_user_id=principal.user_id, **body.model_dump())
    db.add(quote)
    # Flush before anything reads quote.id: the primary key comes from a
    # Python-side default that is only evaluated at flush time.
    db.flush()

    total_capex = body.price_inr + (body.installation_inr or 0.0)
    action = db.get(Action, rfq.action_id) if rfq.action_id else None
    if action is not None:
        quote.comparison = recompute_economics(
            {
                "expected_abatement_tco2e": action.expected_abatement_tco2e,
                "expected_annual_benefit_inr": action.expected_annual_benefit_inr,
                "expected_capex_inr": action.expected_capex_inr,
                "lifetime_yrs": (action.engine_snapshot or {}).get("lifetime_yrs", 10),
            },
            total_capex, body.annual_opex_delta_inr, None,
        )
        quote.revised_payback_yrs = quote.comparison.get("payback_yrs")
        quote.revised_lcoa_inr_per_tco2e = quote.comparison.get("lcoa_inr_per_tco2e")

    if rfq.status in ("DRAFT", "OPEN"):
        rfq.status = "QUOTED"

    events.emit(db, events.NEW_QUOTE, organization_id=rfq.organization_id,
                factory_id=rfq.factory_id, correlation_id=rfq.id,
                payload={"rfq_id": rfq.id, "quote_id": quote.id,
                         "provider_id": provider.id, "provider_name": provider.name,
                         "price_inr": body.price_inr})
    db.commit()
    out = QuoteOut.model_validate(quote)
    out.provider_name = provider.name
    return out


@router.get("/rfqs/{rfq_id}/compare", response_model=QuoteComparison)
def compare_quotes(rfq_id: str, principal: CurrentPrincipal, db: DbSession) -> QuoteComparison:
    """Quotes side by side, each with payback recomputed at its own price. FR-38."""
    rfq = _rfq_for_principal(db, principal, rfq_id)
    quotes = db.scalars(select(Quote).where(Quote.rfq_id == rfq.id)).all()
    providers = {
        p.id: p for p in db.scalars(
            select(Provider).where(Provider.id.in_([q.provider_id for q in quotes] or [""]))
        ).all()
    }
    action = db.get(Action, rfq.action_id) if rfq.action_id else None

    out: list[QuoteOut] = []
    for quote in quotes:
        item = QuoteOut.model_validate(quote)
        provider = providers.get(quote.provider_id)
        item.provider_name = provider.name if provider else None
        out.append(item)
    out.sort(key=lambda q: (q.revised_payback_yrs if q.revised_payback_yrs is not None else 1e9))

    return QuoteComparison(
        rfq=_rfq_out(db, rfq),
        quotes=out,
        engine_estimate={
            "expected_capex_inr": action.expected_capex_inr if action else None,
            "expected_annual_benefit_inr": action.expected_annual_benefit_inr if action else None,
            "expected_payback_yrs": action.expected_payback_yrs if action else None,
            "expected_abatement_tco2e": action.expected_abatement_tco2e if action else None,
        } if action else {},
        note=(
            "Payback and LCOA on each quote are recomputed with that quote's price using the "
            "same formulas as the assessment. The engine's own capex figure is a planning-grade "
            "estimate for ranking options, not a quotation."
        ),
    )


@router.post("/quotes/{quote_id}/accept", response_model=QuoteOut)
def accept_quote(quote_id: str, principal: CurrentPrincipal, db: DbSession,
                 ip: ClientIp) -> QuoteOut:
    quote = db.get(Quote, quote_id)
    if quote is None:
        raise NotFound("Quote not found.")
    rfq = _rfq_for_principal(db, principal, quote.rfq_id, write=True)
    if rfq.accepted_quote_id:
        raise Conflict("A quote has already been accepted on this RFQ.", "quote_already_accepted")

    quote.status = "ACCEPTED"
    rfq.accepted_quote_id = quote.id
    rfq.status = "ACCEPTED"
    for other in db.scalars(select(Quote).where(Quote.rfq_id == rfq.id, Quote.id != quote.id)).all():
        other.status = "REJECTED"

    action = db.get(Action, rfq.action_id) if rfq.action_id else None
    if action is not None and action.status in ("PROPOSED", "SELECTED", "RFQ"):
        action.status = "APPROVED"

    db.add(ImplementationJob(
        quote_id=quote.id, rfq_id=rfq.id, factory_id=rfq.factory_id,
        provider_id=quote.provider_id, action_id=rfq.action_id, status="SCHEDULED",
    ))
    audit.record(db, action="quote.accept", object_type="quote", object_id=quote.id,
                 organization_id=rfq.organization_id, actor_user_id=principal.user_id,
                 actor_label=principal.user.email, ip_address=ip,
                 new_value={"rfq_id": rfq.id, "price_inr": quote.price_inr})
    events.emit(db, events.QUOTE_ACCEPTED, organization_id=rfq.organization_id,
                factory_id=rfq.factory_id, actor_user_id=principal.user_id,
                correlation_id=rfq.id,
                payload={"rfq_id": rfq.id, "quote_id": quote.id,
                         "provider_id": quote.provider_id})
    db.commit()
    return QuoteOut.model_validate(quote)


# --------------------------------------------------------------------------
# material listings
# --------------------------------------------------------------------------

@router.post("/materials", response_model=MaterialListingOut,
             status_code=status.HTTP_201_CREATED)
def create_listing(body: MaterialListingIn, principal: CurrentPrincipal,
                   db: DbSession) -> MaterialListingOut:
    provider = require_provider(db, principal)
    if body.embodied_tco2e_per_t is not None and not body.embodied_source:
        # A carbon claim with no source is a marketing statement. FR-39 stores
        # the factor and its source; we refuse the number without the source.
        raise BadRequest(
            "An embodied carbon figure must come with its source. "
            "Set embodied_source, or reference a registry factor with embodied_factor_key.",
            "carbon_claim_without_source",
        )
    listing = MaterialListing(provider_id=provider.id, **body.model_dump())
    db.add(listing)
    db.commit()
    out = MaterialListingOut.model_validate(listing)
    out.provider_name = provider.name
    return out


@router.get("/materials", response_model=list[MaterialListingOut])
def list_listings(db: DbSession, material_key: str | None = None, state: str | None = None,
                  mode: str = Query(default="balanced", pattern="^(cheapest|lowest_carbon|balanced)$"),
                  limit: int = Query(default=50, ge=1, le=200)) -> list[MaterialListingOut]:
    """Raw-material listings. FR-39 ranking modes.

    Cost and carbon are ranked separately and the balanced mode is a declared
    blend, so the user can always see which axis a listing won on rather than
    being handed one opaque score.
    """
    stmt = select(MaterialListing).where(MaterialListing.is_active.is_(True))
    if material_key:
        stmt = stmt.where(MaterialListing.material_key == material_key)
    if state:
        stmt = stmt.where(MaterialListing.state == state)
    rows = list(db.scalars(stmt.limit(limit)).all())

    if mode == "cheapest":
        rows.sort(key=lambda r: r.price_inr_per_t if r.price_inr_per_t is not None else 1e18)
    elif mode == "lowest_carbon":
        rows.sort(key=lambda r: r.embodied_tco2e_per_t
                  if r.embodied_tco2e_per_t is not None else 1e18)
    else:
        prices = [r.price_inr_per_t for r in rows if r.price_inr_per_t]
        carbons = [r.embodied_tco2e_per_t for r in rows if r.embodied_tco2e_per_t]
        max_price = max(prices) if prices else 1.0
        max_carbon = max(carbons) if carbons else 1.0
        rows.sort(key=lambda r: (
            0.5 * ((r.price_inr_per_t or max_price) / max_price)
            + 0.5 * ((r.embodied_tco2e_per_t or max_carbon) / max_carbon)
        ))

    providers = {
        p.id: p for p in db.scalars(
            select(Provider).where(Provider.id.in_([r.provider_id for r in rows] or [""]))
        ).all()
    }
    out: list[MaterialListingOut] = []
    for row in rows:
        item = MaterialListingOut.model_validate(row)
        provider = providers.get(row.provider_id)
        item.provider_name = provider.name if provider else None
        out.append(item)
    return out
