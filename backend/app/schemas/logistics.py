"""Logistics schemas: route planning, shipment management, and truck pooling."""
from __future__ import annotations

import datetime as dt
from typing import Any

from pydantic import Field

from app.schemas.common import ApiModel


class RouteAlternativeOut(ApiModel):
    preset: str
    distance_km: float
    transit_hours: float
    cost_inr: float
    emissions_kgco2e: float
    vehicle: str
    description: str
    carbon_reduction_pct: float | None = None


class RoutePlanRequest(ApiModel):
    origin_gps: list[float] = Field(default_factory=lambda: [11.1085, 77.3411])
    destination_gps: list[float] = Field(default_factory=lambda: [13.0827, 80.2707])
    payload_tonnes: float = Field(default=12.0, ge=0.01)
    cargo_type: str = "General Freight"
    options: dict[str, Any] = Field(default_factory=dict)


class RoutePlanResponse(ApiModel):
    origin_gps: list[float]
    destination_gps: list[float]
    payload_tonnes: float
    routes: dict[str, RouteAlternativeOut]


class ShipmentCreate(ApiModel):
    factory_id: str | None = None
    origin_name: str = "Origin Facility"
    origin_lat: float = Field(ge=-90, le=90)
    origin_lon: float = Field(ge=-180, le=180)
    destination_name: str = "Destination Hub"
    dest_lat: float = Field(ge=-90, le=90)
    dest_lon: float = Field(ge=-180, le=180)
    payload_tonnes: float = Field(default=1.0, gt=0)
    cargo_type: str = "General Freight"
    earliest_pickup: dt.datetime | None = None
    latest_delivery: dt.datetime | None = None
    selected_route_preset: str | None = None
    client_ref: str | None = None


class ShipmentOut(ApiModel):
    id: str
    factory_id: str | None = None
    organization_id: str | None = None
    origin_name: str
    origin_lat: float
    origin_lon: float
    destination_name: str
    dest_lat: float
    dest_lon: float
    payload_tonnes: float
    cargo_type: str
    earliest_pickup: dt.datetime | None = None
    latest_delivery: dt.datetime | None = None
    status: str
    pooled_run_id: str | None = None
    assigned_vehicle_id: str | None = None
    selected_route_preset: str | None = None
    distance_km: float | None = None
    transit_hours: float | None = None
    cost_inr: float | None = None
    emissions_kgco2e: float | None = None
    tracking_metadata: dict[str, Any] = Field(default_factory=dict)
    client_ref: str | None = None
    created_at: dt.datetime
    updated_at: dt.datetime


class VehicleCreate(ApiModel):
    vehicle_id_plate: str = Field(min_length=3, max_length=64)
    fleet_operator: str = Field(min_length=1, max_length=128)
    vehicle_class: str = Field(min_length=1, max_length=64)
    fuel_type: str = Field(min_length=1, max_length=64)
    payload_capacity_t: float = Field(gt=0)
    current_location: str = Field(min_length=1, max_length=128)
    current_lat: float | None = Field(default=None, ge=-90, le=90)
    current_lon: float | None = Field(default=None, ge=-180, le=180)
    route_capability: str = ""
    well_to_wheel_factor_kgco2e_per_tkm: float = Field(gt=0)


class VehicleOut(ApiModel):
    id: str
    organization_id: str | None = None
    vehicle_id_plate: str
    fleet_operator: str
    vehicle_class: str
    fuel_type: str
    payload_capacity_t: float
    current_location: str
    current_lat: float | None = None
    current_lon: float | None = None
    route_capability: str
    well_to_wheel_factor_kgco2e_per_tkm: float
    status: str
    data_mode: str
    created_at: dt.datetime
    updated_at: dt.datetime


class PoolingMatchRequest(ApiModel):
    shipments: list[dict[str, Any]] | None = None
    shipment_ids: list[str] | None = None


class PoolingMatchResponse(ApiModel):
    status: str
    algorithm: str
    total_shipments_evaluated: int
    trucks_dispatched_before: int
    trucks_dispatched_after: int
    truck_count_reduction_pct: float
    pooled_runs: list[dict[str, Any]]
    standalone_summary: dict[str, Any]
    pooled_summary: dict[str, Any]
    net_savings: dict[str, Any]


class BackhaulMatchRequest(ApiModel):
    destination_cluster: str = "Chennai Port"
    empty_truck_capacity_tonnes: float = Field(default=16.0, gt=0)


class BackhaulMatchResponse(ApiModel):
    outbound_destination: str
    truck_capacity_tonnes: float
    matched_backhauls_count: int
    candidate_backhauls: list[dict[str, Any]]
    potential_cost_recovery_inr: float
