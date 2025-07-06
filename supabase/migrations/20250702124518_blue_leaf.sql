/*
  # Fix occupancy report function

  1. Database Functions
    - Drop and recreate `get_occupancy_report` function
    - Fix interval + integer operation error
    - Ensure proper type casting for date arithmetic

  2. Changes
    - Replace invalid interval + integer operations with proper PostgreSQL syntax
    - Use interval multiplication or proper date arithmetic
    - Maintain the same function signature and return type
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS get_occupancy_report(uuid, date, date);

-- Recreate the function with proper interval arithmetic
CREATE OR REPLACE FUNCTION get_occupancy_report(
  company_id_param uuid,
  start_date date,
  end_date date
)
RETURNS TABLE (
  total_rooms integer,
  total_room_nights integer,
  booked_room_nights integer,
  occupancy_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH room_data AS (
    SELECT 
      COUNT(r.id) as total_rooms_count,
      -- Calculate total possible room nights: number of rooms * number of days
      COUNT(r.id) * (end_date - start_date + 1) as total_possible_nights
    FROM rooms r
    WHERE r.company_id = company_id_param
  ),
  booking_data AS (
    SELECT 
      -- Calculate booked room nights: sum of (check_out_date - check_in_date) for each booking
      COALESCE(SUM(b.check_out_date - b.check_in_date), 0) as total_booked_nights
    FROM bookings b
    WHERE b.company_id = company_id_param
      AND b.check_in_date <= end_date
      AND b.check_out_date >= start_date
  )
  SELECT 
    rd.total_rooms_count::integer,
    rd.total_possible_nights::integer,
    bd.total_booked_nights::integer,
    CASE 
      WHEN rd.total_possible_nights > 0 
      THEN ROUND((bd.total_booked_nights::numeric / rd.total_possible_nights::numeric) * 100, 2)
      ELSE 0::numeric
    END as occupancy_rate
  FROM room_data rd, booking_data bd;
END;
$$ LANGUAGE plpgsql;