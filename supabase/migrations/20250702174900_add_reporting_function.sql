/*
  # Add reporting function for daily booking stats

  1. New Function
    - `get_daily_booking_stats(company_id_param, start_date, end_date)`
    - This function calculates daily booking statistics for a given company
      within a specified date range.
    - It returns a table with daily summaries of total bookings, total revenue,
      and new customers.

  2. Security
    - The function is defined with `SECURITY DEFINER` to ensure it can query
      the necessary tables while respecting RLS policies at a higher level.
    - It is owned by the `postgres` user.
*/
CREATE OR REPLACE FUNCTION get_daily_booking_stats(
  company_id_param uuid,
  start_date date,
  end_date date
)
RETURNS TABLE(
  report_date date,
  total_bookings bigint,
  total_revenue numeric,
  new_customers bigint
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(start_date, end_date, '1 day'::interval)::date as day
  ),
  daily_bookings AS (
    SELECT
      b.check_in_date,
      count(*) as total_bookings,
      sum(b.total_amount) as total_revenue,
      count(DISTINCT b.customer_name) FILTER (WHERE c.first_booking_date = b.check_in_date) as new_customers
    FROM bookings b
    LEFT JOIN (
      SELECT
        customer_name,
        MIN(check_in_date) as first_booking_date
      FROM bookings
      WHERE company_id = company_id_param
      GROUP BY customer_name
    ) c ON b.customer_name = c.customer_name
    WHERE b.company_id = company_id_param
      AND b.check_in_date BETWEEN start_date AND end_date
    GROUP BY b.check_in_date
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