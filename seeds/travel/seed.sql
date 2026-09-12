-- Mock rows. Apply after domains/travel/schema.sql and views.sql.
-- UNIX comments are civil times in the airport's timezone (or UTC for bookings/quotes).

INSERT INTO trips (id, name, remarks, personal_llc, family_business, company_reimbursable, created_at, updated_at) VALUES
  ('trip_seminar_sf', 'SF Seminar 2026', 'Two one-way tickets', 0, 0, 1, 1768046400, 1768046400), -- 2026-01-10 12:00 UTC
  ('trip_japan', 'Japan 2026', 'Single round-trip PNR', 0, 0, 0, 1769947200, 1769947200), -- 2026-02-01 12:00 UTC
  ('trip_satvatove', 'Satvatove seminar', NULL, 1, 0, 0, 1775034000, 1775034000), -- 2026-04-01 09:00 UTC
  ('trip_family', 'Family property', NULL, 0, 1, 0, 1772452800, 1772452800); -- 2026-03-02 12:00 UTC

-- Company trip: one-way nonstop JFK→SFO. Reimbursement still outstanding.
INSERT INTO flights (
  id, trip_id, airline, booked_time, cancelled_time, cabin_class,
  cost, cost_currency, cost_ineligible_for_points, points_cost,
  purpose, confirmation_code, remarks,
  company_reimbursed_time, created_at, updated_at
) VALUES (
  'flt_sf_out', 'trip_seminar_sf', 'UA', 1772377200, NULL, 'economy', -- booked 2026-03-01 15:00 UTC
  420.00, 'USD', 5.6, 35000,
  'work seminar', 'ABCDEF', NULL,
  NULL, 1772377200, 1772377200
);

INSERT INTO flight_legs (id, flight_id, remarks, created_at, updated_at) VALUES
  ('leg_sf_out', 'flt_sf_out', NULL, 1772377200, 1772377200);

INSERT INTO flight_leg_portions (
  id, flight_leg_id, depart_time, arrive_time,
  depart_airport, arrive_airport, flight_number, operated_by, created_at, updated_at
) VALUES (
  'por_sf_out', 'leg_sf_out',
  1789214400, 1789237800, -- JFK 2026-09-12 08:00 EDT; SFO 11:30 PDT
  'JFK', 'SFO', 'UA441', NULL, 1772377200, 1772377200
);

-- Company trip: one-way connecting SFO→JFK via DEN. Operated by SkyWest (OO) on the first portion. Reimbursed.
INSERT INTO flights (
  id, trip_id, airline, booked_time, cancelled_time, cabin_class,
  cost, cost_currency, cost_ineligible_for_points, points_cost,
  purpose, confirmation_code, remarks,
  company_reimbursed_time, created_at, updated_at
) VALUES (
  'flt_sf_ret', 'trip_seminar_sf', 'UA', 1772377500, NULL, 'economy', -- booked 2026-03-01 15:05 UTC
  380.00, 'USD', 5.6, 32000,
  'work seminar', 'GHIJKL', NULL,
  1772452800, 1772377500, 1772452800 -- reimbursed 2026-03-02 12:00 UTC
);

INSERT INTO flight_legs (id, flight_id, remarks, created_at, updated_at) VALUES
  ('leg_sf_ret', 'flt_sf_ret', NULL, 1772377500, 1772377500);

INSERT INTO flight_leg_portions (
  id, flight_leg_id, depart_time, arrive_time,
  depart_airport, arrive_airport, flight_number, operated_by, created_at, updated_at
) VALUES
  ('por_sf_ret_1', 'leg_sf_ret',
   1789513200, 1789522200, -- SFO 2026-09-15 16:00 PDT; DEN 19:30 MDT
   'SFO', 'DEN', 'UA200', 'OO', 1772377500, 1772377500),
  ('por_sf_ret_2', 'leg_sf_ret',
   1789528500, 1789542600, -- DEN 21:15 MDT; JFK 2026-09-16 03:10 EDT
   'DEN', 'JFK', 'UA450', NULL, 1772377500, 1772377500);

-- Planned stub: date + airports only.
INSERT INTO flights (
  id, trip_id, airline, booked_time, cancelled_time, cabin_class,
  cost, cost_currency, cost_ineligible_for_points, points_cost,
  purpose, confirmation_code, remarks,
  company_reimbursed_time, created_at, updated_at
) VALUES (
  'flt_plan', NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, 5.6, NULL,
  NULL, NULL, 'Need to book',
  NULL, 1785578400, 1785578400 -- created 2026-08-01 10:00 UTC
);

INSERT INTO flight_legs (id, flight_id, remarks, created_at, updated_at) VALUES
  ('leg_plan', 'flt_plan', NULL, 1785578400, 1785578400);

INSERT INTO flight_leg_portions (
  id, flight_leg_id, depart_time, arrive_time,
  depart_airport, arrive_airport, flight_number, operated_by, created_at, updated_at
) VALUES (
  'por_plan', 'leg_plan',
  1793682000, NULL, -- BOS 2026-11-03 00:00 EST (date-only)
  'BOS', 'ORD', NULL, NULL, 1785578400, 1785578400
);

-- Cancelled planned stub.
INSERT INTO flights (
  id, trip_id, airline, booked_time, cancelled_time, cabin_class,
  cost, cost_currency, cost_ineligible_for_points, points_cost,
  purpose, confirmation_code, remarks,
  company_reimbursed_time, created_at, updated_at
) VALUES (
  'flt_cancel', NULL, NULL, NULL, 1780315200, NULL, -- cancelled 2026-06-01 12:00 UTC
  NULL, NULL, 5.6, NULL,
  NULL, NULL, 'Dropped',
  NULL, 1780315200, 1780315200
);

INSERT INTO flight_legs (id, flight_id, remarks, created_at, updated_at) VALUES
  ('leg_cancel', 'flt_cancel', NULL, 1780315200, 1780315200);

INSERT INTO flight_leg_portions (
  id, flight_leg_id, depart_time, arrive_time,
  depart_airport, arrive_airport, flight_number, operated_by, created_at, updated_at
) VALUES (
  'por_cancel', 'leg_cancel',
  1796101200, NULL, -- 2026-12-01 00:00 EST
  'JFK', 'MIA', NULL, NULL, 1780315200, 1780315200
);

-- Personal round-trip, one ticket, two legs (points).
INSERT INTO flights (
  id, trip_id, airline, booked_time, cancelled_time, cabin_class,
  cost, cost_currency, cost_ineligible_for_points, points_cost,
  purpose, confirmation_code, remarks,
  company_reimbursed_time, created_at, updated_at
) VALUES (
  'flt_jp_rt', 'trip_japan', 'NH', 1776276000, NULL, 'business', -- booked 2026-04-15 18:00 UTC
  890.00, 'USD', 5.6, 45000,
  'personal', 'RTJPN1', NULL,
  NULL, 1776276000, 1776276000
);

INSERT INTO flight_legs (id, flight_id, remarks, created_at, updated_at) VALUES
  ('leg_jp_out', 'flt_jp_rt', NULL, 1776276000, 1776276000),
  ('leg_jp_ret', 'flt_jp_rt', NULL, 1776276000, 1776276000);

INSERT INTO flight_leg_portions (
  id, flight_leg_id, depart_time, arrive_time,
  depart_airport, arrive_airport, flight_number, operated_by, created_at, updated_at
) VALUES
  ('por_jp_out', 'leg_jp_out',
   1790880600, 1790924400, -- LAX 2026-10-01 11:50 PDT; NRT 2026-10-02 16:00 JST
   'LAX', 'NRT', 'NH6', NULL, 1776276000, 1776276000),
  ('por_jp_ret', 'leg_jp_ret',
   1791792000, 1791829800, -- NRT 2026-10-12 17:00 JST; LAX 11:30 PDT
   'NRT', 'LAX', 'NH5', NULL, 1776276000, 1776276000);

-- Multi-city one ticket: LAX→ORD, ORD→JFK (completed relative to late 2026).
INSERT INTO flights (
  id, trip_id, airline, booked_time, cancelled_time, cabin_class,
  cost, cost_currency, cost_ineligible_for_points, points_cost,
  purpose, confirmation_code, remarks,
  company_reimbursed_time, created_at, updated_at
) VALUES (
  'flt_multi', NULL, 'AA', 1775034000, NULL, 'economy', -- booked 2026-04-01 09:00 UTC
  310.00, 'USD', 5.6, 22000,
  NULL, 'MC001', NULL,
  NULL, 1775034000, 1775034000
);

INSERT INTO flight_legs (id, flight_id, remarks, created_at, updated_at) VALUES
  ('leg_mc_1', 'flt_multi', NULL, 1775034000, 1775034000),
  ('leg_mc_2', 'flt_multi', NULL, 1775034000, 1775034000);

INSERT INTO flight_leg_portions (
  id, flight_leg_id, depart_time, arrive_time,
  depart_airport, arrive_airport, flight_number, operated_by, created_at, updated_at
) VALUES
  ('por_mc_1', 'leg_mc_1',
   1779285600, 1779300600, -- LAX 2026-05-20 07:00 PDT; ORD 13:10 CDT
   'LAX', 'ORD', 'AA100', NULL, 1775034000, 1775034000),
  ('por_mc_2', 'leg_mc_2',
   1779312600, 1779320700, -- ORD 16:30 CDT; JFK 19:45 EDT
   'ORD', 'JFK', 'AA20', NULL, 1775034000, 1775034000);

-- Personal LLC (Satvatove).
INSERT INTO flights (
  id, trip_id, airline, booked_time, cancelled_time, cabin_class,
  cost, cost_currency, cost_ineligible_for_points, points_cost,
  purpose, confirmation_code, remarks,
  company_reimbursed_time, created_at, updated_at
) VALUES (
  'flt_llc', 'trip_satvatove', 'UA', 1776276000, NULL, 'economy',
  240.00, 'USD', 5.6, 18000,
  'Satvatove seminar', 'LLC001', NULL,
  NULL, 1776276000, 1776276000
);

INSERT INTO flight_legs (id, flight_id, remarks, created_at, updated_at) VALUES
  ('leg_llc', 'flt_llc', NULL, 1776276000, 1776276000);

INSERT INTO flight_leg_portions (
  id, flight_leg_id, depart_time, arrive_time,
  depart_airport, arrive_airport, flight_number, operated_by, created_at, updated_at
) VALUES (
  'por_llc', 'leg_llc',
  1788285600, 1788300000, -- JFK 2026-09-01 14:00 EDT; ORD 17:00 CDT
  'JFK', 'ORD', 'UA150', NULL, 1776276000, 1776276000
);

-- Family business, past.
INSERT INTO flights (
  id, trip_id, airline, booked_time, cancelled_time, cabin_class,
  cost, cost_currency, cost_ineligible_for_points, points_cost,
  purpose, confirmation_code, remarks,
  company_reimbursed_time, created_at, updated_at
) VALUES (
  'flt_fam', 'trip_family', 'AA', 1772452800, NULL, 'economy',
  180.00, 'USD', 5.6, 12000,
  'family property', 'FAM001', NULL,
  NULL, 1772452800, 1772452800
);

INSERT INTO flight_legs (id, flight_id, remarks, created_at, updated_at) VALUES
  ('leg_fam', 'flt_fam', NULL, 1772452800, 1772452800);

INSERT INTO flight_leg_portions (
  id, flight_leg_id, depart_time, arrive_time,
  depart_airport, arrive_airport, flight_number, operated_by, created_at, updated_at
) VALUES (
  'por_fam', 'leg_fam',
  1783170000, 1783174800, -- MIA 2026-07-04 09:00 EDT; TLH 10:20 EDT
  'MIA', 'TLH', 'AA3300', 'OH', 1772452800, 1772452800 -- PSA (OH)
);

-- Credits: draw-down e-credits, 1-use companion/award, unlimited promo, expired.
INSERT INTO travel_credits (
  id, airline, kind, original_amount, currency, uses, percent_off,
  expires_at, code, remarks, created_at, updated_at
) VALUES
  ('cr_ua_ecredit', 'UA', 'flight_credit', 400.00, 'USD', NULL, NULL,
   1803859200, 'UA-EC-4001', NULL, 1772377200, 1772377200), -- expires 2027-03-01 00:00 UTC
  ('cr_ua_companion', 'UA', 'companion_certificate', 600.00, 'USD', 1, 50,
   1798675200, 'UA-CMP-18', 'MileagePlus companion', 1772377200, 1772377200), -- expires 2026-12-31 00:00 UTC
  ('cr_aa_promo', 'AA', 'discount_code', NULL, NULL, NULL, 20,
   1790812800, 'FALL20', NULL, 1775034000, 1775034000), -- unlimited until 2026-10-01 00:00 UTC
  ('cr_ua_award', 'UA', 'award', NULL, NULL, 1, NULL,
   1794700800, 'UA-AW-77', 'Premier award', 1772377200, 1772377200), -- expires 2026-11-15 00:00 UTC
  ('cr_aa_used', 'AA', 'flight_credit', 50.00, 'USD', NULL, NULL,
   1798675200, 'AA-EC-50', NULL, 1772452800, 1772452800), -- expires 2026-12-31 00:00 UTC
  ('cr_expired', 'UA', 'flight_credit', 75.00, 'USD', NULL, NULL,
   1748736000, 'UA-EC-OLD', 'Lapsed', 1738886400, 1738886400); -- expired 2025-06-01 00:00 UTC

INSERT INTO flight_payments (
  id, flight_id, amount, travel_credit_id, account_id, remarks, created_at, updated_at
) VALUES
  ('pay_sf_out_cr', 'flt_sf_out', 250.00, 'cr_ua_ecredit', NULL, NULL, 1772377200, 1772377200),
  ('pay_sf_out_card', 'flt_sf_out', 170.00, NULL, '', NULL, 1772377200, 1772377200),
  ('pay_sf_ret_card', 'flt_sf_ret', 380.00, NULL, '', NULL, 1772377500, 1772377500),
  ('pay_jp_pts', 'flt_jp_rt', 45000, NULL, NULL, NULL, 1776276000, 1776276000),
  ('pay_multi_card', 'flt_multi', 310.00, NULL, '', NULL, 1775034000, 1775034000),
  ('pay_llc_card', 'flt_llc', 240.00, NULL, '', NULL, 1776276000, 1776276000),
  ('pay_fam_cr', 'flt_fam', 50.00, 'cr_aa_used', NULL, NULL, 1772452800, 1772452800),
  ('pay_fam_card', 'flt_fam', 130.00, NULL, '', NULL, 1772452800, 1772452800);

-- Point valuations as of 2025-02-07 00:00 UTC (1738886400)
INSERT INTO loyalty_programs (id, kind, name, airline, created_at, updated_at) VALUES
  ('amex_mr', 'card', 'AmEx Membership Rewards', NULL, 1738886400, 1738886400),
  ('capital_one_miles', 'card', 'Capital One Miles', NULL, 1738886400, 1738886400),
  ('citi_thankyou', 'card', 'Citi ThankYou Points', NULL, 1738886400, 1738886400),
  ('hilton_honors', 'hotel', 'Hilton Honors', NULL, 1738886400, 1738886400),
  ('ihg_one', 'hotel', 'IHG One Rewards', NULL, 1738886400, 1738886400),
  ('marriott_bonvoy', 'hotel', 'Marriott Bonvoy', NULL, 1738886400, 1738886400),
  ('hyatt', 'hotel', 'Hyatt World of Hyatt', NULL, 1738886400, 1738886400),
  ('aa_aadvantage', 'airline', 'American Airlines Aadvantage', 'AA', 1738886400, 1738886400),
  ('delta_skymiles', 'airline', 'Delta SkyMiles', 'DL', 1738886400, 1738886400),
  ('frontier_miles', 'airline', 'Frontier Airlines Frontier Miles', 'F9', 1738886400, 1738886400),
  ('jetblue_trueblue', 'airline', 'JetBlue TrueBlue', 'B6', 1738886400, 1738886400),
  ('southwest_rr', 'airline', 'Southwest Airlines Rapid Rewards', 'WN', 1738886400, 1738886400),
  ('spirit_free_spirit', 'airline', 'Spirit Airlines Free Spirit', 'NK', 1738886400, 1738886400),
  ('united_mileageplus', 'airline', 'United Airlines MileagePlus', 'UA', 1738886400, 1738886400);

INSERT INTO point_quotes (id, program_id, source, amount_per_point, currency, as_of, created_at, updated_at) VALUES
  ('q_amex_tpg', 'amex_mr', 'tpg', 0.0200, 'USD', 1738886400, 1738886400, NULL),
  ('q_amex_nw', 'amex_mr', 'nerdwallet', 0.0100, 'USD', 1738886400, 1738886400, NULL),
  ('q_amex_up', 'amex_mr', 'upgraded_points', 0.0220, 'USD', 1738886400, 1738886400, NULL),
  ('q_amex_br', 'amex_mr', 'bankrate', 0.0100, 'USD', 1738886400, 1738886400, NULL),
  ('q_cap_tpg', 'capital_one_miles', 'tpg', 0.0185, 'USD', 1738886400, 1738886400, NULL),
  ('q_cap_nw', 'capital_one_miles', 'nerdwallet', 0.0100, 'USD', 1738886400, 1738886400, NULL),
  ('q_cap_up', 'capital_one_miles', 'upgraded_points', 0.0180, 'USD', 1738886400, 1738886400, NULL),
  ('q_cap_br', 'capital_one_miles', 'bankrate', 0.0100, 'USD', 1738886400, 1738886400, NULL),
  ('q_citi_tpg', 'citi_thankyou', 'tpg', 0.0180, 'USD', 1738886400, 1738886400, NULL),
  ('q_citi_nw', 'citi_thankyou', 'nerdwallet', 0.0100, 'USD', 1738886400, 1738886400, NULL),
  ('q_citi_up', 'citi_thankyou', 'upgraded_points', 0.0160, 'USD', 1738886400, 1738886400, NULL),
  ('q_citi_br', 'citi_thankyou', 'bankrate', 0.0100, 'USD', 1738886400, 1738886400, NULL),
  ('q_hil_tpg', 'hilton_honors', 'tpg', 0.0060, 'USD', 1738886400, 1738886400, NULL),
  ('q_hil_nw', 'hilton_honors', 'nerdwallet', 0.0060, 'USD', 1738886400, 1738886400, NULL),
  ('q_hil_up', 'hilton_honors', 'upgraded_points', 0.0050, 'USD', 1738886400, 1738886400, NULL),
  ('q_hil_br', 'hilton_honors', 'bankrate', 0.0060, 'USD', 1738886400, 1738886400, NULL),
  ('q_ihg_tpg', 'ihg_one', 'tpg', 0.0050, 'USD', 1738886400, 1738886400, NULL),
  ('q_ihg_nw', 'ihg_one', 'nerdwallet', 0.0050, 'USD', 1738886400, 1738886400, NULL),
  ('q_ihg_up', 'ihg_one', 'upgraded_points', 0.0050, 'USD', 1738886400, 1738886400, NULL),
  ('q_ihg_br', 'ihg_one', 'bankrate', 0.0070, 'USD', 1738886400, 1738886400, NULL),
  ('q_mar_tpg', 'marriott_bonvoy', 'tpg', 0.0085, 'USD', 1738886400, 1738886400, NULL),
  ('q_mar_nw', 'marriott_bonvoy', 'nerdwallet', 0.0090, 'USD', 1738886400, 1738886400, NULL),
  ('q_mar_up', 'marriott_bonvoy', 'upgraded_points', 0.0070, 'USD', 1738886400, 1738886400, NULL),
  ('q_mar_br', 'marriott_bonvoy', 'bankrate', 0.0070, 'USD', 1738886400, 1738886400, NULL),
  ('q_hya_tpg', 'hyatt', 'tpg', 0.0170, 'USD', 1738886400, 1738886400, NULL),
  ('q_hya_nw', 'hyatt', 'nerdwallet', 0.0220, 'USD', 1738886400, 1738886400, NULL),
  ('q_hya_up', 'hyatt', 'upgraded_points', 0.0150, 'USD', 1738886400, 1738886400, NULL),
  ('q_hya_br', 'hyatt', 'bankrate', 0.0230, 'USD', 1738886400, 1738886400, NULL),
  ('q_aa_tpg', 'aa_aadvantage', 'tpg', 0.0165, 'USD', 1738886400, 1738886400, NULL),
  ('q_aa_nw', 'aa_aadvantage', 'nerdwallet', 0.0160, 'USD', 1738886400, 1738886400, NULL),
  ('q_aa_up', 'aa_aadvantage', 'upgraded_points', 0.0140, 'USD', 1738886400, 1738886400, NULL),
  ('q_aa_br', 'aa_aadvantage', 'bankrate', 0.0100, 'USD', 1738886400, 1738886400, NULL),
  ('q_dl_tpg', 'delta_skymiles', 'tpg', 0.0120, 'USD', 1738886400, 1738886400, NULL),
  ('q_dl_nw', 'delta_skymiles', 'nerdwallet', 0.0120, 'USD', 1738886400, 1738886400, NULL),
  ('q_dl_up', 'delta_skymiles', 'upgraded_points', 0.0120, 'USD', 1738886400, 1738886400, NULL),
  ('q_dl_br', 'delta_skymiles', 'bankrate', 0.0120, 'USD', 1738886400, 1738886400, NULL),
  ('q_f9_tpg', 'frontier_miles', 'tpg', 0.0110, 'USD', 1738886400, 1738886400, NULL),
  ('q_f9_nw', 'frontier_miles', 'nerdwallet', 0.0150, 'USD', 1738886400, 1738886400, NULL),
  ('q_f9_up', 'frontier_miles', 'upgraded_points', 0.0110, 'USD', 1738886400, 1738886400, NULL),
  ('q_f9_br', 'frontier_miles', 'bankrate', 0.0130, 'USD', 1738886400, 1738886400, NULL),
  ('q_b6_tpg', 'jetblue_trueblue', 'tpg', 0.0135, 'USD', 1738886400, 1738886400, NULL),
  ('q_b6_nw', 'jetblue_trueblue', 'nerdwallet', 0.0150, 'USD', 1738886400, 1738886400, NULL),
  ('q_b6_up', 'jetblue_trueblue', 'upgraded_points', 0.0130, 'USD', 1738886400, 1738886400, NULL),
  ('q_b6_br', 'jetblue_trueblue', 'bankrate', 0.0130, 'USD', 1738886400, 1738886400, NULL),
  ('q_wn_tpg', 'southwest_rr', 'tpg', 0.0125, 'USD', 1738886400, 1738886400, NULL),
  ('q_wn_nw', 'southwest_rr', 'nerdwallet', 0.0130, 'USD', 1738886400, 1738886400, NULL),
  ('q_wn_up', 'southwest_rr', 'upgraded_points', 0.0130, 'USD', 1738886400, 1738886400, NULL),
  ('q_wn_br', 'southwest_rr', 'bankrate', 0.0150, 'USD', 1738886400, 1738886400, NULL),
  ('q_nk_tpg', 'spirit_free_spirit', 'tpg', 0.0110, 'USD', 1738886400, 1738886400, NULL),
  ('q_nk_nw', 'spirit_free_spirit', 'nerdwallet', 0.0130, 'USD', 1738886400, 1738886400, NULL),
  ('q_nk_up', 'spirit_free_spirit', 'upgraded_points', 0.0110, 'USD', 1738886400, 1738886400, NULL),
  ('q_nk_br', 'spirit_free_spirit', 'bankrate', 0.0100, 'USD', 1738886400, 1738886400, NULL),
  ('q_ua_tpg', 'united_mileageplus', 'tpg', 0.0130, 'USD', 1738886400, 1738886400, NULL),
  ('q_ua_nw', 'united_mileageplus', 'nerdwallet', 0.0120, 'USD', 1738886400, 1738886400, NULL),
  ('q_ua_up', 'united_mileageplus', 'upgraded_points', 0.0120, 'USD', 1738886400, 1738886400, NULL),
  ('q_ua_br', 'united_mileageplus', 'bankrate', 0.0090, 'USD', 1738886400, 1738886400, NULL);
