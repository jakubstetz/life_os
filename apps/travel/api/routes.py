from __future__ import annotations

import os
import sqlite3

from fastapi import APIRouter, HTTPException

from domain import flights, iata, legs, portions, quotes, stubs, trips
from domain.db import connect

router = APIRouter()


def _conn():
    try:
        return connect()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e


@router.get("/ref/catalog")
def ref_catalog():
    """IATA airports + airlines, indexed from the published CSVs."""
    return iata.catalog()


@router.get("/map-config")
def map_config():
    """Tile URL for the inspector map. CARTO key is optional; Esri dark gray needs none."""
    key = os.environ.get("CARTO_BASEMAPS_KEY", "").strip()
    if key:
        return {
            "url": (
                "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                f"?key={key}"
            ),
            "subdomains": "abcd",
            "attribution": "CARTO",
        }
    return {
        "url": (
            "https://server.arcgisonline.com/ArcGIS/rest/services/"
            "Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        ),
        "subdomains": None,
        "attribution": "Esri",
    }


@router.get("/trips")
def get_trips():
    conn = _conn()
    try:
        return trips.list_trips(conn)
    finally:
        conn.close()


@router.put("/trips/{trip_id}")
def put_trip(trip_id: str, body: dict):
    conn = _conn()
    try:
        body = dict(body)
        body["id"] = trip_id
        return trips.save_trip(conn, body)
    finally:
        conn.close()


@router.post("/trips")
def post_trip(body: dict):
    conn = _conn()
    try:
        return trips.save_trip(conn, body)
    finally:
        conn.close()


@router.get("/flights")
def get_flights():
    conn = _conn()
    try:
        return flights.list_flights(conn)
    finally:
        conn.close()


@router.get("/flights/{flight_id}")
def get_flight(flight_id: str):
    conn = _conn()
    try:
        row = flights.get_flight(conn, flight_id)
        if not row:
            raise HTTPException(404, "flight not found")
        return row
    finally:
        conn.close()


@router.put("/flights/{flight_id}")
def put_flight(flight_id: str, body: dict):
    conn = _conn()
    try:
        body = dict(body)
        body["id"] = flight_id
        return flights.save_flight(conn, body)
    finally:
        conn.close()


@router.post("/flights")
def post_flight(body: dict):
    conn = _conn()
    try:
        return flights.create_flight(conn, body)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    finally:
        conn.close()


@router.post("/flights/planned-stub")
def post_planned_stub(body: dict):
    conn = _conn()
    try:
        return stubs.create_planned_stub(
            conn,
            depart_time=int(body["depart_time"]),
            from_airport=body["from_airport"],
            to_airport=body["to_airport"],
            trip_id=body.get("trip_id"),
        )
    except (KeyError, TypeError, ValueError) as e:
        raise HTTPException(400, str(e)) from e
    finally:
        conn.close()


@router.post("/flights/{flight_id}/book")
def post_book(flight_id: str, body: dict | None = None):
    conn = _conn()
    try:
        booked_time = (body or {}).get("booked_time")
        return flights.book_flight(conn, flight_id, booked_time)
    except KeyError:
        raise HTTPException(404, "flight not found")
    finally:
        conn.close()


@router.post("/flights/{flight_id}/cancel")
def post_cancel(flight_id: str, body: dict | None = None):
    conn = _conn()
    try:
        cancelled_time = (body or {}).get("cancelled_time")
        return flights.cancel_flight(conn, flight_id, cancelled_time)
    except KeyError:
        raise HTTPException(404, "flight not found")
    finally:
        conn.close()


@router.post("/flights/{flight_id}/reimbursed")
def post_reimbursed(flight_id: str, body: dict | None = None):
    conn = _conn()
    try:
        t = (body or {}).get("company_reimbursed_time")
        return flights.set_reimbursed(conn, flight_id, t)
    except KeyError:
        raise HTTPException(404, "flight not found")
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    finally:
        conn.close()


@router.get("/flights/{flight_id}/portions")
def get_portions(flight_id: str):
    conn = _conn()
    try:
        return portions.list_portions(conn, flight_id)
    finally:
        conn.close()


@router.get("/legs")
def get_all_legs():
    conn = _conn()
    try:
        return legs.list_board(conn)
    finally:
        conn.close()


@router.get("/legs/{leg_id}")
def get_one_leg(leg_id: str):
    conn = _conn()
    try:
        row = legs.get_board_leg(conn, leg_id)
        if not row:
            raise HTTPException(404, "leg not found")
        return row
    finally:
        conn.close()


@router.get("/flights/{flight_id}/legs")
def get_legs(flight_id: str):
    conn = _conn()
    try:
        return legs.list_legs(conn, flight_id)
    finally:
        conn.close()


@router.post("/flights/{flight_id}/legs")
def post_leg(flight_id: str, body: dict | None = None):
    conn = _conn()
    try:
        return legs.add_leg(conn, flight_id, (body or {}).get("remarks"))
    finally:
        conn.close()


@router.put("/legs/{leg_id}")
def put_leg(leg_id: str, body: dict):
    conn = _conn()
    try:
        body = dict(body)
        body["id"] = leg_id
        return legs.save_leg(conn, body)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    finally:
        conn.close()


@router.put("/portions/{portion_id}")
def put_portion(portion_id: str, body: dict):
    conn = _conn()
    try:
        body = dict(body)
        body["id"] = portion_id
        return portions.save_portion(conn, body)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    finally:
        conn.close()


@router.post("/legs/{leg_id}/portions")
def post_portion(leg_id: str, body: dict):
    conn = _conn()
    try:
        return portions.add_portion(conn, leg_id, body)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    finally:
        conn.close()


@router.get("/valuations")
def get_valuations():
    conn = _conn()
    try:
        return quotes.list_valuations(conn)
    finally:
        conn.close()


@router.get("/programs")
def get_programs():
    conn = _conn()
    try:
        return quotes.list_programs(conn)
    finally:
        conn.close()


@router.get("/quotes")
def get_quotes(program_id: str | None = None):
    conn = _conn()
    try:
        return quotes.list_quotes(conn, program_id)
    finally:
        conn.close()


@router.post("/programs")
def post_program(body: dict):
    conn = _conn()
    try:
        return quotes.insert_program(conn, body)
    finally:
        conn.close()


@router.post("/quotes")
def post_quote(body: dict):
    conn = _conn()
    try:
        return quotes.insert_quote(conn, body)
    except sqlite3.IntegrityError as e:
        raise HTTPException(409, str(e)) from e
    finally:
        conn.close()
