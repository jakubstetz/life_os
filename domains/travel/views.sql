-- Apply after schema.sql.
-- Valuation as of a booking: same queries after WHERE as_of <= flights.booked_time.

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
