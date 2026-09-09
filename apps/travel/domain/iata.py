"""IATA name/city/coords lookup from published directories.

Files live in ``apps/travel/data/`` (not git; not the travel volume). Download:

* ``airports.csv`` — OurAirports, public domain
  https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv
* ``countries.csv`` — OurAirports, public domain
  https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/countries.csv
* ``airlines.dat`` — OpenFlights
  https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat
"""

from __future__ import annotations

import csv
import re
from pathlib import Path

_DIR = Path(__file__).resolve().parents[1] / "data"
_IATA3 = re.compile(r"^[A-Z0-9]{3}$")
_IATA2 = re.compile(r"^[A-Z0-9]{2}$")
_TYPE_RANK = {
    "large_airport": 0,
    "medium_airport": 1,
    "small_airport": 2,
    "seaplane_base": 3,
    "heliport": 4,
}

_cache: dict | None = None


def _cell(v: str | None) -> str:
    t = (v or "").strip()
    if t in ("\\N", "N/A", "-"):
        return ""
    return t


def _airports() -> dict[str, dict]:
    path = _DIR / "airports.csv"
    best: dict[str, tuple[int, int, dict]] = {}
    with path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            iata = _cell(row.get("iata_code")).upper()
            if not _IATA3.match(iata):
                continue
            if _cell(row.get("type")) == "closed":
                continue
            name = _cell(row.get("name"))
            if not name:
                continue
            try:
                lat = float(row["latitude_deg"])
                lon = float(row["longitude_deg"])
            except (TypeError, ValueError, KeyError):
                continue
            rank = _TYPE_RANK.get(_cell(row.get("type")), 9)
            sched = 0 if _cell(row.get("scheduled_service")).lower() == "yes" else 1
            rec = {
                "name": name,
                "city": _cell(row.get("municipality")) or None,
                "country": _cell(row.get("iso_country")).upper() or None,
                "region": _cell(row.get("iso_region")).upper() or None,
                "lat": lat,
                "lon": lon,
            }
            prev = best.get(iata)
            if prev is None or (rank, sched) < prev[:2]:
                best[iata] = (rank, sched, rec)
    return {k: v[2] for k, v in best.items()}


def _airlines() -> dict[str, dict]:
    path = _DIR / "airlines.dat"
    best: dict[str, tuple[int, str]] = {}
    with path.open(newline="", encoding="utf-8") as f:
        for row in csv.reader(f):
            if len(row) < 8:
                continue
            name = _cell(row[1])
            iata = _cell(row[3]).upper()
            active = _cell(row[7]).upper()
            if not _IATA2.match(iata):
                continue
            if not name or name in ("Unknown", "Private flight"):
                continue
            inactive = 0 if active == "Y" else 1
            prev = best.get(iata)
            if prev is None or inactive < prev[0]:
                best[iata] = (inactive, name)
    return {k: {"name": v[1]} for k, v in best.items()}


def _countries() -> dict[str, str]:
    path = _DIR / "countries.csv"
    if not path.exists():
        return {}
    out: dict[str, str] = {}
    with path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            code = _cell(row.get("code")).upper()
            name = _cell(row.get("name"))
            if code and name:
                out[code] = name
    return out


def catalog() -> dict:
    global _cache
    if _cache is None:
        _cache = {
            "airports": _airports(),
            "airlines": _airlines(),
            "countries": _countries(),
        }
    return _cache
