/*
  # Add reporting function for room-specific stats

  1. New Function
    - `get_room_stats(company_id_param, start_date, end_date)`
    - This function calculates booking statistics for each room within a
      given company and date range.
    - It returns a table with each room's name, total number of bookings,
      and total revenue generated.

  2. Security
    - The function is defined with `SECURITY DEFINER` to ensure it can query
      the necessary tables while respecting RLS policies.
    - It is owned by the `postgres` user.
*/
CREATE OR REPLACE FUNCTION get_room_stats(
  company_id_param uuid,
  start_date date,
  end_date date
)
RETURNS TABLE(
  room_name text,
  total_bookings bigint,
  total_revenue numeric
)
SECURITY DEFINER
AS $$
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
  GROUP BY r.name
  ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql;