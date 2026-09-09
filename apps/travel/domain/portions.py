from __future__ import annotations

import sqlite3

from domain.db import now
from domain.ids import new_id

_COLS = (
    "flight_leg_id",
    "depart_time",
    "arrive_time",
    "depart_airport",
    "arrive_airport",
    "flight_number",
    "operated_by",
)


def list_portions(conn: sqlite3.Connection, flight_id: str) -> list[dict]:
    rows = conn.execute(
        """
        SELECT p.*, l.flight_id
        FROM flight_leg_portions p
        JOIN flight_legs l ON l.id = p.flight_leg_id
        WHERE l.flight_id = ?
        ORDER BY p.depart_time
        """,
        (flight_id,),
    ).fetchall()
    out = []
    for i, r in enumerate(rows):
        d = dict(r)
        nxt = rows[i + 1] if i + 1 < len(rows) else None
        layover = None
        if (
            nxt
            and nxt["flight_leg_id"] == r["flight_leg_id"]
            and r["arrive_time"] is not None
            and nxt["depart_time"] is not None
        ):
            layover = (nxt["depart_time"] - r["arrive_time"]) / 60
        d["layover_minutes"] = layover
        out.append(d)
    return out


def get_portion(conn: sqlite3.Connection, portion_id: str) -> dict | None:
    row = conn.execute(
        "SELECT * FROM flight_leg_portions WHERE id = ?", (portion_id,)
    ).fetchone()
    return dict(row) if row else None


def save_portion(conn: sqlite3.Connection, portion: dict) -> dict:
    portion_id = portion.get("id") or new_id("por")
    existing = get_portion(conn, portion_id)
    created = existing["created_at"] if existing else now()
    values = {c: portion.get(c) for c in _COLS}
    if existing:
        for c in _COLS:
            if c not in portion:
                values[c] = existing[c]
    if not values.get("flight_leg_id"):
        raise ValueError("flight_leg_id is required")
    if values.get("depart_time") is None:
        raise ValueError("depart_time is required")
    conn.execute(
        f"""
        INSERT INTO flight_leg_portions (id, {", ".join(_COLS)}, created_at, updated_at)
        VALUES (?, {", ".join("?" * len(_COLS))}, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          {", ".join(f"{c} = excluded.{c}" for c in _COLS)},
          updated_at = excluded.updated_at
        """,
        (portion_id, *[values[c] for c in _COLS], created, now()),
    )
    conn.commit()
    saved = get_portion(conn, portion_id)
    assert saved is not None
    return saved


def add_portion(conn: sqlite3.Connection, leg_id: str, portion: dict) -> dict:
    portion = dict(portion)
    portion["flight_leg_id"] = leg_id
    portion.pop("id", None)
    return save_portion(conn, portion)
