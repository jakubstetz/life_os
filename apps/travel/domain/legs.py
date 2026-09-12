from __future__ import annotations

import sqlite3

from domain.db import now
from domain.flights import _status
from domain.ids import new_id
from domain.payments import list_for_flight


def _board_row(conn: sqlite3.Connection, leg: dict) -> dict:
    portions = conn.execute(
        """
        SELECT id, flight_leg_id, depart_time, arrive_time, depart_airport, arrive_airport, flight_number
        FROM flight_leg_portions
        WHERE flight_leg_id = ?
        ORDER BY depart_time
        """,
        (leg["id"],),
    ).fetchall()
    portions = [dict(p) for p in portions]
    first = portions[0] if portions else None
    last = portions[-1] if portions else None
    n = len(portions)
    layover: dict
    if n <= 1:
        layover = {"kind": "none"}
    elif n == 2:
        a, b = portions[0], portions[1]
        minutes = None
        if a.get("arrive_time") is not None and b.get("depart_time") is not None:
            minutes = (b["depart_time"] - a["arrive_time"]) / 60
        layover = {
            "kind": "one",
            "airport": a.get("arrive_airport"),
            "minutes": minutes,
            "until": b.get("depart_time"),
        }
    else:
        layover = {"kind": "multiple"}

    flight = conn.execute(
        "SELECT * FROM flights WHERE id = ?", (leg["flight_id"],)
    ).fetchone()
    flight = dict(flight) if flight else {}
    if flight.get("id"):
        flight["payments"] = list_for_flight(conn, flight["id"])
    trip = None
    if flight.get("trip_id"):
        trip = conn.execute(
            "SELECT * FROM trips WHERE id = ?", (flight["trip_id"],)
        ).fetchone()
        trip = dict(trip) if trip else None

    origin = first["depart_airport"] if first else None
    destination = last["arrive_airport"] if last else None
    return {
        **leg,
        "origin": origin,
        "destination": destination,
        "depart_time": first["depart_time"] if first else None,
        "arrive_time": (
            last["arrive_time"]
            if last and last.get("arrive_time") is not None
            else (last["depart_time"] if last else None)
        ),
        "layover": layover,
        "portions": portions,
        "airline": flight.get("airline"),
        "confirmation_code": flight.get("confirmation_code"),
        "flight": flight,
        "trip_name": trip["name"] if trip else None,
        "personal_llc": bool(trip["personal_llc"]) if trip else False,
        "family_business": bool(trip["family_business"]) if trip else False,
        "company_reimbursable": bool(trip["company_reimbursable"]) if trip else False,
        "company_reimbursed_time": flight.get("company_reimbursed_time"),
        "status": _status(
            flight.get("booked_time"),
            flight.get("cancelled_time"),
            first["depart_time"] if first else None,
            (
                last["arrive_time"]
                if last and last.get("arrive_time") is not None
                else (last["depart_time"] if last else None)
            ),
            now(),
        ),
    }


def list_board(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("SELECT * FROM flight_legs").fetchall()
    board = [_board_row(conn, dict(r)) for r in rows]
    board.sort(key=lambda r: (r["depart_time"] is None, r["depart_time"] or 0))
    return board


def get_board_leg(conn: sqlite3.Connection, leg_id: str) -> dict | None:
    row = get_leg(conn, leg_id)
    if not row:
        return None
    return _board_row(conn, row)


def list_legs(conn: sqlite3.Connection, flight_id: str) -> list[dict]:
    rows = conn.execute(
        """
        SELECT l.*
        FROM flight_legs l
        LEFT JOIN (
          SELECT flight_leg_id, MIN(depart_time) AS first_depart
          FROM flight_leg_portions
          GROUP BY flight_leg_id
        ) p ON p.flight_leg_id = l.id
        WHERE l.flight_id = ?
        ORDER BY p.first_depart
        """,
        (flight_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def get_leg(conn: sqlite3.Connection, leg_id: str) -> dict | None:
    row = conn.execute("SELECT * FROM flight_legs WHERE id = ?", (leg_id,)).fetchone()
    return dict(row) if row else None


def save_leg(conn: sqlite3.Connection, leg: dict) -> dict:
    leg_id = leg.get("id") or new_id("leg")
    existing = get_leg(conn, leg_id)
    created = existing["created_at"] if existing else now()
    flight_id = leg.get("flight_id") or (existing["flight_id"] if existing else None)
    if not flight_id:
        raise ValueError("flight_id is required")
    conn.execute(
        """
        INSERT INTO flight_legs (id, flight_id, remarks, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          remarks = excluded.remarks,
          updated_at = excluded.updated_at
        """,
        (leg_id, flight_id, leg.get("remarks"), created, now()),
    )
    conn.commit()
    saved = get_leg(conn, leg_id)
    assert saved is not None
    return saved


def add_leg(conn: sqlite3.Connection, flight_id: str, remarks: str | None = None) -> dict:
    return save_leg(conn, {"flight_id": flight_id, "remarks": remarks})


def delete_leg(conn: sqlite3.Connection, leg_id: str) -> None:
    leg = get_leg(conn, leg_id)
    if not leg:
        raise KeyError(leg_id)
    flight_id = leg["flight_id"]
    conn.execute("DELETE FROM flight_leg_portions WHERE flight_leg_id = ?", (leg_id,))
    conn.execute("DELETE FROM flight_legs WHERE id = ?", (leg_id,))
    remaining = conn.execute(
        "SELECT COUNT(*) FROM flight_legs WHERE flight_id = ?", (flight_id,)
    ).fetchone()[0]
    if remaining == 0:
        conn.execute("DELETE FROM flight_payments WHERE flight_id = ?", (flight_id,))
        conn.execute("DELETE FROM flights WHERE id = ?", (flight_id,))
    conn.commit()
