from __future__ import annotations

import sqlite3

from domain.db import now
from domain.ids import new_id

_COLS = (
    "airline",
    "kind",
    "original_amount",
    "currency",
    "uses",
    "percent_off",
    "expires_at",
    "code",
    "remarks",
)


def _clean(values: dict) -> dict:
    out = dict(values)
    if out.get("airline"):
        out["airline"] = str(out["airline"]).strip().upper()
    if out.get("currency"):
        out["currency"] = str(out["currency"]).strip().upper()
    if out.get("code"):
        out["code"] = str(out["code"]).strip()
    for col in _COLS:
        if out.get(col) == "":
            out[col] = None
    if out.get("uses") is not None:
        out["uses"] = int(out["uses"])
    return out


def _usages(conn: sqlite3.Connection, credit_id: str) -> list[dict]:
    rows = conn.execute(
        """
        SELECT p.id, p.flight_id, p.amount, f.cost_currency AS currency,
               f.confirmation_code, f.airline AS flight_airline
        FROM flight_payments p
        JOIN flights f ON f.id = p.flight_id
        WHERE p.travel_credit_id = ?
        ORDER BY p.created_at
        """,
        (credit_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def _row(conn: sqlite3.Connection, raw: sqlite3.Row) -> dict:
    out = dict(raw)
    out["usages"] = _usages(conn, out["id"])
    return out


def list_credits(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("SELECT * FROM travel_credits_current").fetchall()
    out = [_row(conn, r) for r in rows]
    rank = {"available": 0, "expired": 1, "used": 2}
    out.sort(
        key=lambda c: (
            rank.get(c["status"], 9),
            c["expires_at"] is None,
            c["expires_at"] or 0,
        )
    )
    return out


def get_credit(conn: sqlite3.Connection, credit_id: str) -> dict | None:
    row = conn.execute(
        "SELECT * FROM travel_credits_current WHERE id = ?", (credit_id,)
    ).fetchone()
    if not row:
        return None
    return _row(conn, row)


def delete_credit(conn: sqlite3.Connection, credit_id: str) -> None:
    row = conn.execute(
        "SELECT id FROM travel_credits WHERE id = ?", (credit_id,)
    ).fetchone()
    if not row:
        raise KeyError(credit_id)
    conn.execute(
        "DELETE FROM flight_payments WHERE travel_credit_id = ?", (credit_id,)
    )
    conn.execute("DELETE FROM travel_credits WHERE id = ?", (credit_id,))
    conn.commit()


def save_credit(conn: sqlite3.Connection, credit: dict) -> dict:
    credit_id = credit.get("id") or new_id("cr")
    existing = conn.execute(
        "SELECT created_at FROM travel_credits WHERE id = ?", (credit_id,)
    ).fetchone()
    created = existing["created_at"] if existing else now()
    values = _clean({col: credit.get(col) for col in _COLS})
    conn.execute(
        f"""
        INSERT INTO travel_credits (id, {", ".join(_COLS)}, created_at, updated_at)
        VALUES (?, {", ".join("?" * len(_COLS))}, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          {", ".join(f"{c} = excluded.{c}" for c in _COLS)},
          updated_at = excluded.updated_at
        """,
        (credit_id, *[values[c] for c in _COLS], created, now()),
    )
    conn.commit()
    saved = get_credit(conn, credit_id)
    assert saved is not None
    return saved
