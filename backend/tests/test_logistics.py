"""
Tests for Green Route Planner, Multi-Tenant Truck Pooling, and Shipments (PRD Section 15, B4).
"""
from __future__ import annotations

from fastapi.testclient import TestClient


def test_route_planner_four_presets(client: TestClient) -> None:
    res = client.post("/api/routes/plan", json={
        "origin_gps": [11.0168, 76.9558],  # Coimbatore
        "destination_gps": [13.0827, 80.2707],  # Chennai
        "payload_tonnes": 12.0,
    })
    assert res.status_code == 200
    data = res.json()
    assert "routes" in data
    routes = data["routes"]
    assert "fastest" in routes
    assert "cheapest" in routes
    assert "lowest_carbon" in routes
    assert "balanced" in routes

    # Verify fastest is quicker than cheapest/standard
    assert routes["fastest"]["transit_hours"] < routes["cheapest"]["transit_hours"]
    # Verify lowest carbon emissions are substantially lower than road diesel
    assert routes["lowest_carbon"]["emissions_kgco2e"] < routes["fastest"]["emissions_kgco2e"]
    assert routes["lowest_carbon"]["carbon_reduction_pct"] > 50


def test_shipment_crud_and_status(client: TestClient) -> None:
    # 1. Create shipment
    create_res = client.post("/api/shipments", json={
        "origin_name": "Tirupur Textile Plant",
        "origin_lat": 11.1085,
        "origin_lon": 77.3411,
        "destination_name": "Chennai Port Terminal",
        "dest_lat": 13.0827,
        "dest_lon": 80.2707,
        "payload_tonnes": 8.5,
        "cargo_type": "Dyed Cotton Yarn",
        "selected_route_preset": "BALANCED",
        "client_ref": "OFFLINE-QUEUE-TEST-001",
    })
    assert create_res.status_code == 201
    shipment = create_res.json()
    assert shipment["id"].startswith("shp_")
    assert shipment["origin_name"] == "Tirupur Textile Plant"
    assert shipment["distance_km"] > 300
    assert shipment["cost_inr"] > 0
    assert shipment["emissions_kgco2e"] > 0
    assert shipment["client_ref"] == "OFFLINE-QUEUE-TEST-001"

    # 2. Duplicate client_ref returns existing without creating duplicate (Idempotency)
    dup_res = client.post("/api/shipments", json={
        "origin_name": "Tirupur Textile Plant",
        "origin_lat": 11.1085,
        "origin_lon": 77.3411,
        "destination_name": "Chennai Port Terminal",
        "dest_lat": 13.0827,
        "dest_lon": 80.2707,
        "payload_tonnes": 8.5,
        "cargo_type": "Dyed Cotton Yarn",
        "client_ref": "OFFLINE-QUEUE-TEST-001",
    })
    assert dup_res.status_code == 201
    assert dup_res.json()["id"] == shipment["id"]

    # 3. Retrieve single shipment
    get_res = client.get(f"/api/shipments/{shipment['id']}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == shipment["id"]

    # 4. List shipments
    list_res = client.get("/api/shipments")
    assert list_res.status_code == 200
    items = list_res.json()
    assert any(s["id"] == shipment["id"] for s in items)


def test_truck_pooling_cvrptw(client: TestClient) -> None:
    # 2 LTL shipments from neighboring MSMEs heading to the same corridor
    res = client.post("/api/pooling/match", json={
        "shipments": [
            {
                "id": "S1",
                "origin_gps": [11.0168, 76.9558],
                "dest_gps": [13.0827, 80.2707],
                "payload_tonnes": 7.0,
                "destination_name": "Chennai Auto Hub",
            },
            {
                "id": "S2",
                "origin_gps": [11.0250, 76.9600],
                "dest_gps": [13.0827, 80.2707],
                "payload_tonnes": 8.0,
                "destination_name": "Chennai Port Container Terminal",
            },
        ],
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "OPTIMIZED"
    assert data["total_shipments_evaluated"] == 2
    assert data["trucks_dispatched_before"] == 2
    assert data["trucks_dispatched_after"] == 1  # Pooled into 1 truck!
    assert data["truck_count_reduction_pct"] == 50.0
    assert len(data["pooled_runs"]) == 1

    run = data["pooled_runs"][0]
    assert run["shipment_count"] == 2
    assert run["total_payload_tonnes"] == 15.0
    assert run["utilization_capacity_pct"] == 75.0

    # Net savings must be strictly positive
    assert data["net_savings"]["carbon_saved_tco2e"] > 0
    assert data["net_savings"]["cost_saved_inr"] > 0


def test_circular_backhaul_matching(client: TestClient) -> None:
    res = client.post("/api/logistics/backhaul", json={
        "destination_cluster": "Chennai Port",
        "empty_truck_capacity_tonnes": 18.0,
    })
    assert res.status_code == 200
    data = res.json()
    assert data["matched_backhauls_count"] > 0
    assert data["potential_cost_recovery_inr"] > 0
    assert all(b["tonnes"] <= 18.0 for b in data["candidate_backhauls"])


def test_vehicle_fleet_management(client: TestClient) -> None:
    res = client.post("/api/logistics/vehicles", json={
        "vehicle_id_plate": "TN-38-ZZ-5555",
        "fleet_operator": "Kovai Green Heavy Freight",
        "vehicle_class": "Electric Heavy Commercial (55t)",
        "fuel_type": "Battery Electric",
        "payload_capacity_t": 32.0,
        "current_location": "Coimbatore, Tamil Nadu",
        "route_capability": "Coimbatore - Tirupur - Salem - Chennai",
        "well_to_wheel_factor_kgco2e_per_tkm": 0.048,
    })
    assert res.status_code == 201
    veh = res.json()
    assert veh["vehicle_id_plate"] == "TN-38-ZZ-5555"
    assert veh["status"] == "AVAILABLE"

    # List vehicles
    list_res = client.get("/api/logistics/vehicles")
    assert list_res.status_code == 200
    assert any(v["vehicle_id_plate"] == "TN-38-ZZ-5555" for v in list_res.json())


def test_signed_in_user_can_list_shipments_and_pool(client: TestClient, manufacturer: dict) -> None:
    """Regression: the authenticated branch of the shipment filters.

    Both filters call `accessible_factory_ids`, which takes the session as its
    first argument. The earlier signature mismatch only fired when a principal
    was present, so every anonymous test passed while a signed-in phone got a
    500 on its Logistics screen.
    """
    headers = manufacturer["headers"]

    created = client.post("/api/shipments", json={
        "origin_name": "Surat GIDC Plant",
        "origin_lat": 21.1702,
        "origin_lon": 72.8311,
        "destination_name": "Mundra Port",
        "dest_lat": 22.8394,
        "dest_lon": 69.7219,
        "payload_tonnes": 11.0,
        "cargo_type": "Synthetic Textiles",
        "selected_route_preset": "LOWEST_CARBON",
    }, headers=headers)
    assert created.status_code == 201, created.text

    listed = client.get("/api/shipments", headers=headers)
    assert listed.status_code == 200, listed.text
    assert isinstance(listed.json(), list)

    pooled = client.post("/api/logistics/pool", json={}, headers=headers)
    assert pooled.status_code == 200, pooled.text
    assert "algorithm" in pooled.json()
