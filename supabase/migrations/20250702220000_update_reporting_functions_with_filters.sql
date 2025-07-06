/*
  # Add Advanced Reporting Functions with Filters (Corrected)

  1. New/Updated Functions
    - Recreates all reporting functions to accept new filtering parameters:
      - `room_ids_param` (uuid[]): An array of room IDs to filter by.
      - `payment_status_param` (text): 'all', 'paid', 'unpaid'.
      - `discount_status_param` (text): 'all', 'discounted', 'not_discounted'.
    - This script ensures all functions have the correct signatures to match the application code.

  2. Functions Included:
    - get_daily_booking_stats
    - get_room_stats
    - get_financial_summary
    - get_discount_report
    - get_occupancy_report

  3. Security
    - All functions remain `SECURITY DEFINER`.
*/

-- get_daily_booking_stats with filters
CREATE OR REPLACE FUNCTION get_daily_booking_stats(
  company_id_param uuid,
  start_date date,
  end_date date,
  room_ids_param uuid[] DEFAULT NULL,
  payment_status_param text DEFAULT 'all',
  discount_status_param text DEFAULT 'all'
)
RETURNS TABLE(report_date date, total_bookings bigint, total_revenue numeric, new_customers bigint)
SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(start_date, end_date, '1 day'::interval)::date as day
  ),
  filtered_bookings AS (
    SELECT * FROM bookings b
    WHERE b.company_id = company_id_param
      AND b.check_in_date BETWEEN start_date AND end_date
      AND (room_ids_param IS NULL OR b.room_id = ANY(room_ids_param))
      AND (payment_status_param = 'all' OR (payment_status_param = 'paid' AND b.is_paid = TRUE) OR (payment_status_param = 'unpaid' AND b.is_paid = FALSE))
      AND (discount_status_param = 'all' OR (discount_status_param = 'discounted' AND b.discount_value > 0) OR (discount_status_param = 'not_discounted' AND b.discount_value = 0))
  ),
  daily_bookings AS (
    SELECT
      fb.check_in_date,
      count(*) as total_bookings,
      sum(fb.total_amount) as total_revenue,
      count(DISTINCT fb.customer_name) FILTER (WHERE c.first_booking_date = fb.check_in_date) as new_customers
    FROM filtered_bookings fb
    LEFT JOIN (
      SELECT customer_name, MIN(check_in_date) as first_booking_date
      FROM bookings WHERE company_id = company_id_param
      GROUP BY customer_name
    ) c ON fb.customer_name = c.customer_name
    GROUP BY fb.check_in_date
  )
  SELECT
    ds.day,
    COALESCE(db.total_bookings, 0),
    COALESCE(db.total_revenue, 0),
    COALESCE(db.new_customers, 0)
  FROM date_series ds
  LEFT JOIN daily_bookings db ON ds.day = db.check_in_date
  ORDER BY ds.day;
END;
$$ LANGUAGE plpgsql;


-- get_room_stats with filters
CREATE OR REPLACE FUNCTION get_room_stats(
  company_id_param uuid,
  start_date date,
  end_date date,
  room_ids_param uuid[] DEFAULT NULL,
  payment_status_param text DEFAULT 'all',
  discount_status_param text DEFAULT 'all'
)
RETURNS TABLE(room_name text, total_bookings bigint, total_revenue numeric)
SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.name as room_name,
    count(b.id) as total_bookings,
    sum(b.total_amount) as total_revenue
  FROM rooms r
  LEFT JOIN bookings b ON r.id = b.room_id
  WHERE r.company_id = company_id_param
    AND b.check_in_date BETWEEN start_date AND end_date
    AND (room_ids_param IS NULL OR b.room_id = ANY(room_ids_param))
    AND (payment_status_param = 'all' OR (payment_status_param = 'paid' AND b.is_paid = TRUE) OR (payment_status_param = 'unpaid' AND b.is_paid = FALSE))
    AND (discount_status_param = 'all' OR (discount_status_param = 'discounted' AND b.discount_value > 0) OR (discount_status_param = 'not_discounted' AND b.discount_value = 0))
  GROUP BY r.name
  ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- get_financial_summary with filters
CREATE OR REPLACE FUNCTION get_financial_summary(
  company_id_param uuid,
  start_date date,
  end_date date,
  room_ids_param uuid[] DEFAULT NULL,
  payment_status_param text DEFAULT 'all',
  discount_status_param text DEFAULT 'all'
)
RETURNS TABLE(paid_revenue numeric, unpaid_revenue numeric, total_advance numeric, total_due numeric)
SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(CASE WHEN is_paid THEN total_amount ELSE 0 END),
    SUM(CASE WHEN NOT is_paid THEN total_amount ELSE 0 END),
    SUM(advance_paid),
    SUM(
      GREATEST(0, 
        CASE 
          WHEN discount_type = 'percentage' THEN total_amount - (total_amount * discount_value / 100) - advance_paid
          ELSE total_amount - discount_value - advance_paid
        END
      )
    )
  FROM bookings
  WHERE company_id = company_id_param
    AND check_in_date BETWEEN start_date AND end_date
    AND (room_ids_param IS NULL OR room_id = ANY(room_ids_param))
    AND (payment_status_param = 'all' OR (payment_status_param = 'paid' AND is_paid = TRUE) OR (payment_status_param = 'unpaid' AND is_paid = FALSE))
    AND (discount_status_param = 'all' OR (discount_status_param = 'discounted' AND discount_value > 0) OR (discount_status_param = 'not_discounted' AND discount_value = 0));
END;
$$ LANGUAGE plpgsql;

-- get_discount_report with filters
CREATE OR REPLACE FUNCTION get_discount_report(
  company_id_param uuid,
  start_date date,
  end_date date,
  room_ids_param uuid[] DEFAULT NULL,
  payment_status_param text DEFAULT 'all'
)
RETURNS TABLE(discount_type text, booking_count bigint, total_discounted numeric)
SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.discount_type,
    count(*) as booking_count,
    SUM(
      CASE
        WHEN b.discount_type = 'percentage' THEN b.total_amount * b.discount_value / 100
        ELSE b.discount_value
      END
    ) as total_discounted
  FROM bookings b
  WHERE b.company_id = company_id_param
    AND b.check_in_date BETWEEN start_date AND end_date
    AND b.discount_value > 0
    AND (room_ids_param IS NULL OR b.room_id = ANY(room_ids_param))
    AND (payment_status_param = 'all' OR (payment_status_param = 'paid' AND b.is_paid = TRUE) OR (payment_status_param = 'unpaid' AND b.is_paid = FALSE))
  GROUP BY b.discount_type;
END;
$$ LANGUAGE plpgsql;

-- get_occupancy_report with filters
CREATE OR REPLACE FUNCTION get_occupancy_report(
  company_id_param uuid,
  start_date date,
  end_date date,
  room_ids_param uuid[] DEFAULT NULL
)
RETURNS TABLE(occupancy_rate numeric)
SECURITY DEFINER AS $$
DECLARE
  total_room_days integer;
  booked_days integer;
  num_days integer;
BEGIN
  num_days := end_date - start_date + 1;

  SELECT INTO total_room_days num_days * count(*)
  FROM rooms
  WHERE company_id = company_id_param AND (room_ids_param IS NULL OR id = ANY(room_ids_param));

  SELECT INTO booked_days COALESCE(SUM(
    LEAST(end_date, check_out_date - INTERVAL '1 day') - GREATEST(start_date, check_in_date) + 1
  ), 0)
  FROM bookings
  WHERE company_id = company_id_param
    AND (room_ids_param IS NULL OR room_id = ANY(room_ids_param))
    AND check_in_date <= end_date AND check_out_date > start_date;
  
  IF total_room_days = 0 THEN
    RETURN QUERY SELECT 0.0;
  ELSE
    RETURN QUERY SELECT (booked_days::numeric / total_room_days) * 100;
  END IF;
END;
$$ LANGUAGE plpgsql;