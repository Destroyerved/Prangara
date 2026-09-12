"""
Logistics: fleet vehicles, shipments, and routing records. PRD section 15.
"""
from __future__ import annotations

import datetime as dt

from sqlalchemy import DateTime, Float, ForeignKey, Index, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, id_column

SHIPMENT_STATUSES = ("PENDING", "POOLED", "DISPATCHED", "DELIVERED", "CANCELLED")
VEHICLE_STATUSES = ("AVAILABLE", "EN_ROUTE", "MAINTENANCE", "RETIRED")


class Vehicle(TimestampMixin, Base):
    """Registered fleet / carrier vehicle for industrial freight dispatch."""

    __tablename__ = "vehicles"
    __table_args__ = (
        Index("ix_vehicles_status_location", "status", "current_location"),
    )

    id: Mapped[str] = id_column("veh")
    organization_id: Mapped[str | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="SET NULL"), index=True
    )
    vehicle_id_plate: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    fleet_operator: Mapped[str] = mapped_column(String(128), nullable=False)
    vehicle_class: Mapped[str] = mapped_column(String(64), nullable=False)
    fuel_type: Mapped[str] = mapped_column(String(64), nullable=False)
    payload_capacity_t: Mapped[float] = mapped_column(Float, nullable=False)
    current_location: Mapped[str] = mapped_column(String(128), nullable=False)
    current_lat: Mapped[float | None] = mapped_column(Float)
    current_lon: Mapped[float | None] = mapped_column(Float)
    route_capability: Mapped[str] = mapped_column(String(256), nullable=False, default="")
    well_to_wheel_factor_kgco2e_per_tkm: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="AVAILABLE")
    data_mode: Mapped[str] = mapped_column(
        String(64), nullable=False, default="FIRST_PARTY_OPERATOR_REPORTED"
    )

    shipments: Mapped[list["Shipment"]] = relationship(back_populates="assigned_vehicle")


class Shipment(TimestampMixin, Base):
    """Consignment / cargo load registered for green routing and multi-tenant pooling."""

    __tablename__ = "shipments"
    __table_args__ = (
        Index("ix_shipments_factory_status", "factory_id", "status"),
    )

    id: Mapped[str] = id_column("shp")
    factory_id: Mapped[str | None] = mapped_column(
        ForeignKey("factories.id", ondelete="SET NULL"), index=True
    )
    organization_id: Mapped[str | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="SET NULL"), index=True
    )

    origin_name: Mapped[str] = mapped_column(String(128), nullable=False)
    origin_lat: Mapped[float] = mapped_column(Float, nullable=False)
    origin_lon: Mapped[float] = mapped_column(Float, nullable=False)

    destination_name: Mapped[str] = mapped_column(String(128), nullable=False)
    dest_lat: Mapped[float] = mapped_column(Float, nullable=False)
    dest_lon: Mapped[float] = mapped_column(Float, nullable=False)

    payload_tonnes: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    cargo_type: Mapped[str] = mapped_column(String(128), nullable=False, default="General Freight")

    earliest_pickup: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    latest_delivery: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))

    status: Mapped[str] = mapped_column(String(32), nullable=False, default="PENDING")
    pooled_run_id: Mapped[str | None] = mapped_column(String(64), index=True)
    assigned_vehicle_id: Mapped[str | None] = mapped_column(
        ForeignKey("vehicles.id", ondelete="SET NULL")
    )

    selected_route_preset: Mapped[str | None] = mapped_column(String(32))
    distance_km: Mapped[float | None] = mapped_column(Float)
    transit_hours: Mapped[float | None] = mapped_column(Float)
    cost_inr: Mapped[float | None] = mapped_column(Float)
    emissions_kgco2e: Mapped[float | None] = mapped_column(Float)

    tracking_metadata: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    client_ref: Mapped[str | None] = mapped_column(String(128), index=True)

    assigned_vehicle: Mapped[Vehicle | None] = relationship(back_populates="shipments")
