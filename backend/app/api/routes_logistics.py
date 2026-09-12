"""
Logistics API: Green Route Planner, Shipment Management, Truck Pooling, and Circular Backhauls.
PRD Section 15 (FR-41, FR-42, FR-43).
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query, status
from sqlalchemy import select

from app.api.deps import ClientIp, CurrentPrincipal, DbSession, OptionalPrincipal
from app.core.errors import BadRequest, NotFound
from app.models.base import utcnow
from app.models.logistics import Shipment, Vehicle
from app.schemas.logistics import (
    BackhaulMatchRequest, BackhaulMatchResponse, PoolingMatchRequest, PoolingMatchResponse,
    RoutePlanRequest, RoutePlanResponse, ShipmentCreate, ShipmentOut, VehicleCreate,
    VehicleOut,
)
from app.services import audit, events
from app.services.access import accessible_factory_ids, resolve_factory
from app.services.logistics_service import LogisticsService

router = APIRouter(prefix="/api", tags=["logistics"])


# --------------------------------------------------------------------------
# Route Planning (FR-41)
# --------------------------------------------------------------------------

@router.post("/routes/plan", response_model=RoutePlanResponse)
@router.post("/logistics/routes", response_model=RoutePlanResponse)
def plan_route(body: RoutePlanRequest) -> RoutePlanResponse:
    """Evaluates 4 multi-objective route presets: FASTEST, CHEAPEST, LOWEST_CARBON, BALANCED."""
    res = LogisticsService.evaluate_route(
        origin_gps=body.origin_gps,
        destination_gps=body.destination_gps,
        payload_tonnes=body.payload_tonnes,
        options=body.options,
    )
    return RoutePlanResponse.model_validate(res)


# --------------------------------------------------------------------------
# Shipments (CRUD)
# --------------------------------------------------------------------------

@router.post("/shipments", response_model=ShipmentOut, status_code=status.HTTP_201_CREATED)
def create_shipment(
    body: ShipmentCreate,
    db: DbSession,
    ip: ClientIp,
    principal: OptionalPrincipal = None,
) -> ShipmentOut:
    """Registers a consignment for green dispatch and pooling. Supports offline client_ref idempotency."""
    org_id = principal.active_org_id if principal else None
    if body.factory_id and principal:
        factory = resolve_factory(db, principal, body.factory_id, write=True)
        org_id = factory.organization_id

    # Idempotency check on client_ref
    if body.client_ref:
        stmt = select(Shipment).where(Shipment.client_ref == body.client_ref)
        if body.factory_id:
            stmt = stmt.where(Shipment.factory_id == body.factory_id)
        existing = db.scalar(stmt)
        if existing is not None:
            return ShipmentOut.model_validate(existing)

    # Calculate default route estimates
    route_calc = LogisticsService.evaluate_route(
        origin_gps=[body.origin_lat, body.origin_lon],
        destination_gps=[body.dest_lat, body.dest_lon],
        payload_tonnes=body.payload_tonnes,
    )
    preset_key = (body.selected_route_preset or "BALANCED").lower()
    selected_route = route_calc["routes"].get(preset_key, route_calc["routes"]["balanced"])

    shipment = Shipment(
        factory_id=body.factory_id,
        organization_id=org_id,
        origin_name=body.origin_name,
        origin_lat=body.origin_lat,
        origin_lon=body.origin_lon,
        destination_name=body.destination_name,
        dest_lat=body.dest_lat,
        dest_lon=body.dest_lon,
        payload_tonnes=body.payload_tonnes,
        cargo_type=body.cargo_type,
        earliest_pickup=body.earliest_pickup,
        latest_delivery=body.latest_delivery,
        selected_route_preset=body.selected_route_preset or "BALANCED",
        distance_km=selected_route["distance_km"],
        transit_hours=selected_route["transit_hours"],
        cost_inr=selected_route["cost_inr"],
        emissions_kgco2e=selected_route["emissions_kgco2e"],
        client_ref=body.client_ref,
        tracking_metadata={"route_options": route_calc["routes"]},
    )
    db.add(shipment)
    db.commit()
    db.refresh(shipment)

    if principal and org_id:
        audit.record(
            db,
            action="shipment.create",
            object_type="shipment",
            object_id=shipment.id,
            organization_id=org_id,
            actor_user_id=principal.user_id,
            actor_label=principal.user.email,
            ip_address=ip,
            new_value={"payload_tonnes": body.payload_tonnes, "destination": body.destination_name},
        )
        events.emit(
            db,
            "SHIPMENT_CREATED",
            organization_id=org_id,
            factory_id=body.factory_id,
            actor_user_id=principal.user_id,
            payload={"shipment_id": shipment.id, "payload_tonnes": body.payload_tonnes},
        )
        db.commit()

    return ShipmentOut.model_validate(shipment)


@router.get("/shipments", response_model=list[ShipmentOut])
def list_shipments(
    db: DbSession,
    factory_id: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    principal: OptionalPrincipal = None,
) -> list[ShipmentOut]:
    """Lists registered shipments."""
    stmt = select(Shipment)
    if factory_id:
        if principal:
            resolve_factory(db, principal, factory_id)
        stmt = stmt.where(Shipment.factory_id == factory_id)
    elif principal:
        allowed_factories = accessible_factory_ids(principal)
        if allowed_factories:
            stmt = stmt.where(
                (Shipment.factory_id.in_(allowed_factories))
                | (Shipment.organization_id == principal.active_org_id)
            )

    if status_filter:
        stmt = stmt.where(Shipment.status == status_filter)

    rows = db.scalars(stmt.order_by(Shipment.created_at.desc())).all()
    return [ShipmentOut.model_validate(r) for r in rows]


@router.get("/shipments/{shipment_id}", response_model=ShipmentOut)
def get_shipment(shipment_id: str, db: DbSession, principal: OptionalPrincipal = None) -> ShipmentOut:
    shipment = db.get(Shipment, shipment_id)
    if shipment is None:
        raise NotFound("Shipment not found.")
    if principal and shipment.factory_id:
        resolve_factory(db, principal, shipment.factory_id)
    return ShipmentOut.model_validate(shipment)


# --------------------------------------------------------------------------
# Multi-Tenant Truck Pooling (FR-42)
# --------------------------------------------------------------------------

@router.post("/pooling/match", response_model=PoolingMatchResponse)
@router.post("/logistics/pool", response_model=PoolingMatchResponse)
def match_pooling(
    body: PoolingMatchRequest,
    db: DbSession,
    principal: OptionalPrincipal = None,
) -> PoolingMatchResponse:
    """Matches LTL shipments within industrial clusters into high-efficiency shared FTL trucks."""
    shipments_to_evaluate: list[dict[str, Any]] = []

    if body.shipments:
        shipments_to_evaluate = body.shipments
    elif body.shipment_ids:
        rows = db.scalars(select(Shipment).where(Shipment.id.in_(body.shipment_ids))).all()
        for r in rows:
            shipments_to_evaluate.append({
                "id": r.id,
                "origin_gps": [r.origin_lat, r.origin_lon],
                "dest_gps": [r.dest_lat, r.dest_lon],
                "payload_tonnes": r.payload_tonnes,
                "destination_name": r.destination_name,
            })
    else:
        # Default: pool all pending shipments in database
        stmt = select(Shipment).where(Shipment.status == "PENDING")
        if principal:
            allowed = accessible_factory_ids(principal)
            if allowed:
                stmt = stmt.where(
                    (Shipment.factory_id.in_(allowed)) | (Shipment.organization_id == principal.active_org_id)
                )
        rows = db.scalars(stmt.limit(50)).all()
        for r in rows:
            shipments_to_evaluate.append({
                "id": r.id,
                "origin_gps": [r.origin_lat, r.origin_lon],
                "dest_gps": [r.dest_lat, r.dest_lon],
                "payload_tonnes": r.payload_tonnes,
                "destination_name": r.destination_name,
            })

    result = LogisticsService.optimize_truck_pooling(shipments_to_evaluate)
    return PoolingMatchResponse.model_validate(result)


# --------------------------------------------------------------------------
# Circular Backhaul Matching (FR-43)
# --------------------------------------------------------------------------

@router.post("/logistics/backhaul", response_model=BackhaulMatchResponse)
def match_backhaul(body: BackhaulMatchRequest) -> BackhaulMatchResponse:
    """Matches returning empty trucks with compatible return loads."""
    res = LogisticsService.match_backhauls(
        destination_cluster=body.destination_cluster,
        empty_truck_capacity_tonnes=body.empty_truck_capacity_tonnes,
    )
    return BackhaulMatchResponse.model_validate(res)


# --------------------------------------------------------------------------
# Fleet & Vehicles
# --------------------------------------------------------------------------

@router.get("/logistics/vehicles", response_model=list[VehicleOut])
def list_vehicles(db: DbSession) -> list[VehicleOut]:
    """Lists registered commercial freight vehicles."""
    vehicles = db.scalars(select(Vehicle).order_by(Vehicle.created_at.desc())).all()
    return [VehicleOut.model_validate(v) for v in vehicles]


@router.post("/logistics/vehicles", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
def create_vehicle(body: VehicleCreate, db: DbSession, principal: OptionalPrincipal = None) -> VehicleOut:
    """Registers a carrier vehicle in the fleet network."""
    existing = db.scalar(select(Vehicle).where(Vehicle.vehicle_id_plate == body.vehicle_id_plate))
    if existing is not None:
        raise BadRequest(f"Vehicle with plate {body.vehicle_id_plate} already registered.", "vehicle_exists")

    veh = Vehicle(
        organization_id=principal.active_org_id if principal else None,
        **body.model_dump(),
    )
    db.add(veh)
    db.commit()
    db.refresh(veh)
    return VehicleOut.model_validate(veh)
