-- Travel volume tables.
-- See schema.md for further commentary beyond what can be conveniently captured in SQL comments.
-- See views.sql for advanced derived queries.

-- Related reservations that share a purpose (e.g. one event, visit, vacation).
CREATE TABLE trips (
  id TEXT PRIMARY KEY,
  name TEXT,                    -- e.g. SF Seminar July 2026, Japan vacation 2023
  remarks TEXT,
  personal_llc BOOLEAN NOT NULL DEFAULT 0,            -- Expense belongs with personal LLC
  family_business BOOLEAN NOT NULL DEFAULT 0,         -- Expense belongs with family business LLC
  company_reimbursable BOOLEAN NOT NULL DEFAULT 0,    -- Full-time work-related; company reimburses this trip
  created_at INTEGER NOT NULL,  -- UNIX seconds UTC
  updated_at INTEGER            -- UNIX seconds UTC (or NULL if never updated)
);

-- One purchase/confirmation/booking/ticket.
CREATE TABLE flights (
  id TEXT PRIMARY KEY,
  trip_id TEXT REFERENCES trips(id),
  airline TEXT,                         -- Managing carrier (IATA, e.g. UA)
  booked_time INTEGER,                  -- UNIX seconds UTC; unset until booked
  cancelled_time INTEGER,               -- UNIX seconds UTC; unset unless cancelled
  cabin_class TEXT,                     -- Purchased cabin (upgrades are untracked)
  cost REAL,                            -- Cost in cost_currency
  cost_currency TEXT,                   -- ISO 4217, e.g. USD
  cost_ineligible_for_points REAL DEFAULT 5.6,        -- Slice of cost that can't be paid with points (e.g. US government fee)
  points_cost REAL,                     -- Price in loyalty points
  purchase_method TEXT,                 -- e.g. credit card, points, flight credits
  purpose TEXT,
  confirmation_code TEXT,               -- Record locator
  remarks TEXT,
  company_reimbursed_time INTEGER,      -- UNIX seconds UTC; only if parent trip is company_reimbursable; unset until reimbursement arrives
  created_at INTEGER NOT NULL,          -- UNIX seconds UTC
  updated_at INTEGER                    -- UNIX seconds UTC (or NULL if never updated)
--DERIVED FIELDS:
--itinerary_type          = 1 leg → one_way; 2 legs and first origin = last destination → round_trip; else multi_city.
--points_value            = (cost - cost_ineligible_for_points) / points_cost when points_cost ≠ 0.
--points_value_at_booking = loyalty_program_valuations logic on quotes with as_of <= booked_time, same currency as cost_currency.
--status                  = planned = no booked_time;
--                          booked = booked_time and now < first depart_time;
--                          in_progress = now between first depart_time and last arrive_time;
--                          completed = now after that end;
--cancelled = cancelled_time set.
);

-- One origin→destination on a ticket.
-- One-way with connecting flights = one leg, several portions. Round-trip / multi-city = several legs on one ticket.
CREATE TABLE flight_legs (
  id TEXT PRIMARY KEY,
  flight_id TEXT NOT NULL REFERENCES flights(id),
  remarks TEXT,
  created_at INTEGER NOT NULL, -- UNIX seconds UTC
  updated_at INTEGER           -- UNIX seconds UTC (or NULL if never updated)
--DERIVED FIELDS:
--origin      = first depart_airport
--destination = last arrive_airport
--stops       = count(portions) - 1.
);

-- One takeoff→landing. Connections are extra portions on the same leg.
-- For tentatively planned but unbooked flights, depart_time can be populated and most other fields left blank.
CREATE TABLE flight_leg_portions (
  id TEXT PRIMARY KEY,
  flight_leg_id TEXT NOT NULL REFERENCES flight_legs(id),
  depart_time INTEGER NOT NULL, -- UNIX seconds UTC
  arrive_time INTEGER,          -- UNIX seconds UTC
  depart_airport TEXT,          -- IATA, e.g. SFO
  arrive_airport TEXT,          -- IATA
  flight_number TEXT,           -- e.g. UA441
  operated_by TEXT,             -- Operating carrier (IATA, e.g. PT). Blank when same as ticket airline.
  created_at INTEGER NOT NULL,  -- UNIX seconds UTC
  updated_at INTEGER            -- UNIX seconds UTC (or NULL if never updated)
--DERIVED FIELDS:
--layover_minutes = (next.depart_time - this.arrive_time) / 60.
);

-- Catalog of loyalty programs.
CREATE TABLE loyalty_programs (
  id TEXT PRIMARY KEY,         -- Slug, e.g. united_mileageplus
  kind TEXT NOT NULL,          -- card | hotel | airline
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL, -- UNIX seconds UTC
  updated_at INTEGER           -- UNIX seconds UTC (or NULL if never updated)
);

-- Published money-per-point from a source on a given day.
-- Same-day correction: UPDATE; a later research day: new as_of.
-- Live grid: views.sql loyalty_program_valuations.
CREATE TABLE point_quotes (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL REFERENCES loyalty_programs(id),
  source TEXT NOT NULL,           -- tpg | nerdwallet | upgraded_points | bankrate
  amount_per_point REAL NOT NULL, -- Amount per point in currency
  currency TEXT NOT NULL,         -- ISO 4217
  as_of INTEGER NOT NULL,         -- UNIX seconds UTC; research publication/update date
  created_at INTEGER NOT NULL,    -- UNIX seconds UTC
  updated_at INTEGER,             -- UNIX seconds UTC (or NULL if never updated)
  UNIQUE (program_id, source, currency, as_of)
);
