"""Open travel.sqlite. Path from the data volume root; never a hard-coded home directory."""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path

from dotenv import load_dotenv

_REPO_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(_REPO_ROOT / ".env")


def _resolve(p: str) -> Path:
    path = Path(p).expanduser()
    if not path.is_absolute():
        path = _REPO_ROOT / path
    return path.resolve()


def data_root() -> Path:
    root = os.environ.get("LIFE_OS_DATA_ROOT")
    if root:
        return _resolve(root)
    return _REPO_ROOT / "seeds"


def sqlite_path() -> Path:
    path = data_root() / "travel" / "travel.sqlite"
    if path.is_file():
        return path
    raise FileNotFoundError(
        f"Travel sqlite not found at {path}. "
        "Build the seed (see apps/travel/README.md) or set LIFE_OS_DATA_ROOT."
    )


def connect() -> sqlite3.Connection:
    path = sqlite_path()
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def now() -> int:
    import time

    return int(time.time())
