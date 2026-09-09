from __future__ import annotations

import sqlite3

from domain.db import now
from domain.ids import new_id


def list_programs(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM loyalty_programs ORDER BY kind, name"
    ).fetchall()
    return [dict(r) for r in rows]


def list_valuations(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM loyalty_program_valuations ORDER BY kind, name, currency"
    ).fetchall()
    return [dict(r) for r in rows]


def list_quotes(conn: sqlite3.Connection, program_id: str | None = None) -> list[dict]:
    if program_id:
        rows = conn.execute(
            """
            SELECT * FROM point_quotes
            WHERE program_id = ?
            ORDER BY as_of DESC, source
            """,
            (program_id,),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM point_quotes ORDER BY as_of DESC, program_id, source"
        ).fetchall()
    return [dict(r) for r in rows]


def insert_program(conn: sqlite3.Connection, program: dict) -> dict:
    program_id = program.get("id") or new_id("prog")
    t = now()
    conn.execute(
        """
        INSERT INTO loyalty_programs (id, kind, name, airline, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          kind = excluded.kind,
          name = excluded.name,
          airline = excluded.airline,
          updated_at = excluded.updated_at
        """,
        (program_id, program["kind"], program["name"], program.get("airline"), t, t),
    )
    conn.commit()
    row = conn.execute(
        "SELECT * FROM loyalty_programs WHERE id = ?", (program_id,)
    ).fetchone()
    assert row is not None
    return dict(row)


def insert_quote(conn: sqlite3.Connection, quote: dict) -> dict:
    quote_id = quote.get("id") or new_id("q")
    t = now()
    conn.execute(
        """
        INSERT INTO point_quotes (
          id, program_id, source, amount_per_point, currency, as_of,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            quote_id,
            quote["program_id"],
            quote["source"],
            quote["amount_per_point"],
            quote["currency"],
            quote["as_of"],
            t,
            None,
        ),
    )
    conn.commit()
    row = conn.execute(
        "SELECT * FROM point_quotes WHERE id = ?", (quote_id,)
    ).fetchone()
    assert row is not None
    return dict(row)
