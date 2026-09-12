from __future__ import annotations

import sqlite3

from domain.db import now
from domain.ids import new_id
from domain.payments import list_for_flight, replace_for_flight

_FLIGHT_COLS = (
    "trip_id",
    "airline",
    "booked_time",
    "cancelled_time",
    "cabin_class",
    "cost",
    "cost_currency",
    "cost_ineligible_for_points",
    "points_cost",
    "purpose",
    "confirmation_code",
    "remarks",
    "company_reimbursed_time",
)


def _status(booked_time, cancelled_time, first_depart, last_end, at: int) -> str:
    if cancelled_time:
        return "cancelled"
    if not booked_time:
        return "planned"
    if first_depart is None:
        return "booked"
    if at < first_depart:
        return "booked"
    end = last_end if last_end is not None else first_depart
    if at > end:
        return "completed"
    return "in_progress"


def _itinerary_type(leg_count: int, origin, destination) -> str | None:
    if leg_count <= 0:
        return None
    if leg_count == 1:
        return "one_way"
    if leg_count == 2 and origin and destination and origin == destination:
        return "round_trip"
    return "multi_city"


def _points_value(cost, ineligible, points_cost) -> float | None:
    if cost is None or not points_cost:
        return None
    fee = ineligible if ineligible is not None else 0
    return (cost - fee) / points_cost


def _enrich(conn: sqlite3.Connection, flight: dict, at: int | None = None) -> dict:
    at = at if at is not None else now()
    portions = conn.execute(
        """
        SELECT p.depart_time, p.arrive_time, p.depart_airport, p.arrive_airport,
               p.flight_number, p.flight_leg_id
        FROM flight_leg_portions p
        JOIN flight_legs l ON l.id = p.flight_leg_id
        WHERE l.flight_id = ?
        ORDER BY p.depart_time
        """,
        (flight["id"],),
    ).fetchall()
    legs = conn.execute(
        "SELECT id FROM flight_legs WHERE flight_id = ?",
        (flight["id"],),
    ).fetchall()
    first = portions[0] if portions else None
    last = portions[-1] if portions else None
    origin = first["depart_airport"] if first else None
    destination = last["arrive_airport"] if last else None
    first_depart = first["depart_time"] if first else None
    last_end = None
    if last:
        last_end = last["arrive_time"] if last["arrive_time"] is not None else last["depart_time"]
    trip = None
    if flight.get("trip_id"):
        trip = conn.execute(
            "SELECT * FROM trips WHERE id = ?", (flight["trip_id"],)
        ).fetchone()
    out = dict(flight)
    out["origin"] = origin
    out["destination"] = destination
    out["first_depart_time"] = first_depart
    out["last_arrive_time"] = last_end
    out["stops"] = max(len(portions) - len(legs), 0) if portions else 0
    out["itinerary_type"] = _itinerary_type(len(legs), origin, destination)
    out["status"] = _status(
        flight.get("booked_time"),
        flight.get("cancelled_time"),
        first_depart,
        last_end,
        at,
    )
    out["points_value"] = _points_value(
        flight.get("cost"),
        flight.get("cost_ineligible_for_points"),
        flight.get("points_cost"),
    )
    bits = []
    for p in portions:
        a = p["depart_airport"] or "?"
        b = p["arrive_airport"] or "?"
        num = p["flight_number"]
        bits.append(f"{a} → {b}: {num}" if num else f"{a} → {b}")
    out["routing"] = "  ///  ".join(bits) if bits else None
    out["trip_name"] = trip["name"] if trip else None
    out["personal_llc"] = bool(trip["personal_llc"]) if trip else False
    out["family_business"] = bool(trip["family_business"]) if trip else False
    out["company_reimbursable"] = bool(trip["company_reimbursable"]) if trip else False
    out["payments"] = list_for_flight(conn, flight["id"])
    return out


def list_flights(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("SELECT * FROM flights").fetchall()
    enriched = [_enrich(conn, dict(r)) for r in rows]
    enriched.sort(key=lambda f: (f["first_depart_time"] is None, f["first_depart_time"] or 0))
    return enriched


def get_flight(conn: sqlite3.Connection, flight_id: str) -> dict | None:
    row = conn.execute("SELECT * FROM flights WHERE id = ?", (flight_id,)).fetchone()
    if not row:
        return None
    return _enrich(conn, dict(row))


def create_flight(conn: sqlite3.Connection, body: dict) -> dict:
    """Flight + one leg + one portion, in one transaction.

    Status follows booked_time like any other flight: omit it for a plan,
    set it when recording a booking that never had a stub.
    """
    portion = body.get("portion") or {}
    depart_time = portion.get("depart_time")
    if depart_time is None:
        raise ValueError("portion.depart_time is required")
    from_airport = (portion.get("depart_airport") or "").strip().upper()
    to_airport = (portion.get("arrive_airport") or "").strip().upper()
    if not from_airport or not to_airport:
        raise ValueError("portion.depart_airport and arrive_airport are required")

    t = now()
    flight_id = new_id("flt")
    leg_id = new_id("leg")
    portion_id = new_id("por")
    values = {col: body.get(col) for col in _FLIGHT_COLS}
    for col in _FLIGHT_COLS:
        if values[col] == "":
            values[col] = None
    if values.get("airline"):
        values["airline"] = str(values["airline"]).strip().upper()
    arrive_time = portion.get("arrive_time")
    if arrive_time == "":
        arrive_time = None
    flight_number = (portion.get("flight_number") or "").strip() or None
    operated_by = (portion.get("operated_by") or "").strip().upper() or None

    conn.execute(
        f"""
        INSERT INTO flights (id, {", ".join(_FLIGHT_COLS)}, created_at, updated_at)
        VALUES (?, {", ".join("?" * len(_FLIGHT_COLS))}, ?, ?)
        """,
        (flight_id, *[values[c] for c in _FLIGHT_COLS], t, t),
    )
    conn.execute(
        """
        INSERT INTO flight_legs (id, flight_id, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        """,
        (leg_id, flight_id, t, t),
    )
    conn.execute(
        """
        INSERT INTO flight_leg_portions (
          id, flight_leg_id, depart_time, arrive_time, depart_airport, arrive_airport,
          flight_number, operated_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            portion_id,
            leg_id,
            int(depart_time),
            int(arrive_time) if arrive_time is not None else None,
            from_airport,
            to_airport,
            flight_number,
            operated_by,
            t,
            t,
        ),
    )
    conn.commit()
    if "payments" in body:
        replace_for_flight(conn, flight_id, body.get("payments") or [])
    saved = get_flight(conn, flight_id)
    assert saved is not None
    return saved


def save_flight(conn: sqlite3.Connection, flight: dict) -> dict:
    flight_id = flight.get("id") or new_id("flt")
    existing = conn.execute(
        "SELECT created_at FROM flights WHERE id = ?", (flight_id,)
    ).fetchone()
    created = existing["created_at"] if existing else now()
    values = {col: flight.get(col) for col in _FLIGHT_COLS}
    conn.execute(
        f"""
        INSERT INTO flights (id, {", ".join(_FLIGHT_COLS)}, created_at, updated_at)
        VALUES (?, {", ".join("?" * len(_FLIGHT_COLS))}, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          {", ".join(f"{c} = excluded.{c}" for c in _FLIGHT_COLS)},
          updated_at = excluded.updated_at
        """,
        (
            flight_id,
            *[values[c] for c in _FLIGHT_COLS],
            created,
            now(),
        ),
    )
    conn.commit()
    if "payments" in flight:
        replace_for_flight(conn, flight_id, flight.get("payments") or [])
    saved = get_flight(conn, flight_id)
    assert saved is not None
    return saved


def book_flight(conn: sqlite3.Connection, flight_id: str, booked_time: int | None = None) -> dict:
    t = booked_time if booked_time is not None else now()
    conn.execute(
        "UPDATE flights SET booked_time = ?, updated_at = ? WHERE id = ?",
        (t, now(), flight_id),
    )
    conn.commit()
    saved = get_flight(conn, flight_id)
    if not saved:
        raise KeyError(flight_id)
    return saved


def cancel_flight(conn: sqlite3.Connection, flight_id: str, cancelled_time: int | None = None) -> dict:
    t = cancelled_time if cancelled_time is not None else now()
    conn.execute(
        "UPDATE flights SET cancelled_time = ?, updated_at = ? WHERE id = ?",
        (t, now(), flight_id),
    )
    conn.commit()
    saved = get_flight(conn, flight_id)
    if not saved:
        raise KeyError(flight_id)
    return saved


def set_reimbursed(conn: sqlite3.Connection, flight_id: str, reimbursed_time: int | None) -> dict:
    flight = get_flight(conn, flight_id)
    if not flight:
        raise KeyError(flight_id)
    if reimbursed_time is not None and not flight["company_reimbursable"]:
        raise ValueError("Parent trip is not company_reimbursable")
    conn.execute(
        "UPDATE flights SET company_reimbursed_time = ?, updated_at = ? WHERE id = ?",
        (reimbursed_time, now(), flight_id),
    )
    conn.commit()
    saved = get_flight(conn, flight_id)
    assert saved is not None
    return saved
