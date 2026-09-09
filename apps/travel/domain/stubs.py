from __future__ import annotations

import sqlite3

from domain.flights import create_flight


def create_planned_stub(
    conn: sqlite3.Connection,
    *,
    depart_time: int,
    from_airport: str,
    to_airport: str,
    trip_id: str | None = None,
) -> dict:
    """Minimal plan: flight + one leg + one portion. Prefer create_flight for a full record."""
    return create_flight(
        conn,
        {
            "trip_id": trip_id,
            "portion": {
                "depart_time": depart_time,
                "depart_airport": from_airport,
                "arrive_airport": to_airport,
            },
        },
    )
