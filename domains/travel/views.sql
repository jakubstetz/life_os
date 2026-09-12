-- Apply after schema.sql.
-- Valuation as of a booking: same queries after WHERE as_of <= flights.booked_time.
-- Credit remaining as of now: travel_credits_current.

-- Latest amount_per_point per program × source × currency.
CREATE VIEW point_quotes_current AS
SELECT program_id, source, amount_per_point, currency, as_of
FROM (
  SELECT
    program_id,
    source,
    amount_per_point,
    currency,
    as_of,
    ROW_NUMBER() OVER (
      PARTITION BY program_id, source, currency
      ORDER BY as_of DESC
    ) AS rn
  FROM point_quotes
)
WHERE rn = 1;

-- One row per program × currency from those latest quotes.
CREATE VIEW loyalty_program_valuations AS
SELECT
  p.id AS program_id,
  p.kind,
  p.name,
  p.airline,
  q.currency,
  AVG(q.amount_per_point) AS average,
  MIN(q.amount_per_point) AS min_amount,
  MAX(q.amount_per_point) AS max_amount,
  (MAX(q.amount_per_point) - MIN(q.amount_per_point))
    / AVG(q.amount_per_point) AS relative_spread,
  MAX(q.as_of) AS last_checked
FROM loyalty_programs p
JOIN point_quotes_current q ON q.program_id = p.id
GROUP BY p.id, q.currency;

-- Amount drawn and times applied per credit.
CREATE VIEW travel_credit_usage AS
SELECT
  travel_credit_id,
  COALESCE(SUM(amount), 0) AS used_amount,
  COUNT(*) AS use_count
FROM flight_payments
WHERE travel_credit_id IS NOT NULL
GROUP BY travel_credit_id;

-- Inventory with remaining and status as of now.
CREATE VIEW travel_credits_current AS
SELECT
  c.id,
  c.airline,
  c.kind,
  c.original_amount,
  c.currency,
  c.uses,
  c.percent_off,
  c.expires_at,
  c.code,
  c.remarks,
  c.created_at,
  c.updated_at,
  CASE
    WHEN c.original_amount IS NULL THEN NULL
    ELSE c.original_amount - COALESCE(u.used_amount, 0)
  END AS remaining_amount,
  CASE
    WHEN c.uses IS NULL THEN NULL
    ELSE c.uses - COALESCE(u.use_count, 0)
  END AS remaining_uses,
  CASE
    WHEN c.uses IS NOT NULL
         AND COALESCE(u.use_count, 0) = c.uses THEN 'used'
    WHEN c.original_amount IS NOT NULL
         AND (c.original_amount - COALESCE(u.used_amount, 0)) = 0 THEN 'used'
    WHEN c.expires_at IS NOT NULL
         AND c.expires_at <= CAST(strftime('%s', 'now') AS INTEGER) THEN 'expired'
    ELSE 'available'
  END AS status
FROM travel_credits c
LEFT JOIN travel_credit_usage u ON u.travel_credit_id = c.id;
