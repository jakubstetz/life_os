# Travel app

Spreadsheet-shaped UI over `travel.sqlite`. Python talks to the file; the browser talks to Python over HTTP.

## Run (dev, mock volume)

From repo root:

```bash
# once
python3 -m venv apps/travel/.venv
apps/travel/.venv/bin/pip install -e apps/travel
(cd apps/travel/web && npm install)

# seed db (if needed)
cd seeds/travel
sqlite3 travel.sqlite < ../../domains/travel/schema.sql
sqlite3 travel.sqlite < ../../domains/travel/views.sql
sqlite3 travel.sqlite < seed.sql
cd ../..

cd apps/travel
PYTHONPATH=. .venv/bin/uvicorn api.server:app --reload --port 8000
```

Another terminal:

```bash
cd apps/travel/web
npm run dev
```

Open http://127.0.0.1:5173 — domain list → Travel.

If `LIFE_OS_DATA_ROOT` is unset, the app mounts this repo’s `seeds/` as the data root (`seeds/travel/travel.sqlite`). Set `LIFE_OS_DATA_ROOT` in `.env` for live data (`$LIFE_OS_DATA_ROOT/travel/travel.sqlite`). Relative paths in `.env` are from the Life OS repo root.

Inspector map: Esri dark gray tiles (no key). Optional `CARTO_BASEMAPS_KEY` in `.env` switches to CARTO Dark Matter.

## Layout

- `domain/` — sqlite functions (stable)
- `api/` — FastAPI routes that call `domain/`
- `web/` — React grid (replaceable)
- `data/` — published IATA CSVs; what they are and where to get them is in `domain/iata.py`
