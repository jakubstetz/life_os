from __future__ import annotations

import sqlite3

from domain.db import now
from domain.ids import new_id


def list_trips(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM trips ORDER BY name COLLATE NOCASE"
    ).fetchall()
    return [dict(r) for r in rows]


def get_trip(conn: sqlite3.Connection, trip_id: str) -> dict | None:
    row = conn.execute("SELECT * FROM trips WHERE id = ?", (trip_id,)).fetchone()
    return dict(row) if row else None


def save_trip(conn: sqlite3.Connection, trip: dict) -> dict:
    """Insert or replace a whole trip row (not per-field patch)."""
    trip_id = trip.get("id") or new_id("trip")
    existing = get_trip(conn, trip_id)
    created = existing["created_at"] if existing else now()
    conn.execute(
        """
        INSERT INTO trips (
          id, name, remarks, personal_llc, family_business,
          company_reimbursable, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          remarks = excluded.remarks,
          personal_llc = excluded.personal_llc,
          family_business = excluded.family_business,
          company_reimbursable = excluded.company_reimbursable,
          updated_at = excluded.updated_at
        """,
        (
            trip_id,
            trip.get("name"),
            trip.get("remarks"),
            int(bool(trip.get("personal_llc"))),
            int(bool(trip.get("family_business"))),
            int(bool(trip.get("company_reimbursable"))),
            created,
            now(),
        ),
    )
    conn.commit()
    saved = get_trip(conn, trip_id)
    assert saved is not None
    return saved
