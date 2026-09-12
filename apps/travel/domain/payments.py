from __future__ import annotations

import sqlite3

from domain.db import now
from domain.ids import new_id

_COLS = (
    "flight_id",
    "amount",
    "travel_credit_id",
    "account_id",
    "remarks",
)

# kind and currency are derived (schema.sql). Blank account_id is still a card.
_SELECT = """
SELECT
  p.id,
  p.flight_id,
  p.amount,
  p.travel_credit_id,
  p.account_id,
  p.remarks,
  p.created_at,
  p.updated_at,
  CASE
    WHEN p.travel_credit_id IS NOT NULL THEN c.currency
    WHEN p.account_id IS NOT NULL THEN f.cost_currency
    ELSE NULL
  END AS currency
FROM flight_payments p
JOIN flights f ON f.id = p.flight_id
LEFT JOIN travel_credits c ON c.id = p.travel_credit_id
"""


def _kind(row: dict) -> str:
    if row.get("travel_credit_id"):
        return "travel_credit"
    if row.get("account_id") is not None:
        return "card"
    return "points"


def _hydrate(row: dict) -> dict:
    out = dict(row)
    out["kind"] = _kind(out)
    return out


def _clean(values: dict) -> dict:
    out = dict(values)
    if out.get("travel_credit_id") == "":
        out["travel_credit_id"] = None
    if out.get("account_id") is not None:
        out["account_id"] = str(out["account_id"]).strip()
    for col in _COLS:
        if col == "account_id":
            continue
        if out.get(col) == "":
            out[col] = None
    return out


def list_for_flight(conn: sqlite3.Connection, flight_id: str) -> list[dict]:
    rows = conn.execute(
        _SELECT + " WHERE p.flight_id = ? ORDER BY p.created_at, p.id",
        (flight_id,),
    ).fetchall()
    return [_hydrate(dict(r)) for r in rows]


def _get(conn: sqlite3.Connection, payment_id: str) -> dict:
    row = conn.execute(_SELECT + " WHERE p.id = ?", (payment_id,)).fetchone()
    assert row is not None
    return _hydrate(dict(row))


def save_payment(conn: sqlite3.Connection, payment: dict) -> dict:
    payment_id = payment.get("id") or new_id("pay")
    existing = conn.execute(
        "SELECT created_at FROM flight_payments WHERE id = ?", (payment_id,)
    ).fetchone()
    created = existing["created_at"] if existing else now()
    values = _clean({col: payment.get(col) for col in _COLS})
    if not values.get("flight_id"):
        raise ValueError("flight_id is required")
    conn.execute(
        f"""
        INSERT INTO flight_payments (id, {", ".join(_COLS)}, created_at, updated_at)
        VALUES (?, {", ".join("?" * len(_COLS))}, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          {", ".join(f"{c} = excluded.{c}" for c in _COLS)},
          updated_at = excluded.updated_at
        """,
        (payment_id, *[values[c] for c in _COLS], created, now()),
    )
    conn.commit()
    return _get(conn, payment_id)


def replace_for_flight(
    conn: sqlite3.Connection, flight_id: str, rows: list[dict]
) -> list[dict]:
    """Replace the settlement list for a ticket. New rows may omit id."""
    keep: list[str] = []
    t = now()
    for row in rows or []:
        raw_id = row.get("id")
        existing = None
        if raw_id and not str(raw_id).startswith("tmp_"):
            existing = conn.execute(
                "SELECT created_at FROM flight_payments WHERE id = ?", (raw_id,)
            ).fetchone()
        if existing:
            payment_id = str(raw_id)
        else:
            payment_id = new_id("pay")
        created = existing["created_at"] if existing else t
        values = _clean({col: row.get(col) for col in _COLS})
        values["flight_id"] = flight_id
        conn.execute(
            f"""
            INSERT INTO flight_payments (id, {", ".join(_COLS)}, created_at, updated_at)
            VALUES (?, {", ".join("?" * len(_COLS))}, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              {", ".join(f"{c} = excluded.{c}" for c in _COLS)},
              updated_at = excluded.updated_at
            """,
            (payment_id, *[values[c] for c in _COLS], created, t),
        )
        keep.append(payment_id)
    if keep:
        placeholders = ", ".join("?" * len(keep))
        conn.execute(
            f"DELETE FROM flight_payments WHERE flight_id = ? AND id NOT IN ({placeholders})",
            (flight_id, *keep),
        )
    else:
        conn.execute("DELETE FROM flight_payments WHERE flight_id = ?", (flight_id,))
    conn.commit()
    return list_for_flight(conn, flight_id)
