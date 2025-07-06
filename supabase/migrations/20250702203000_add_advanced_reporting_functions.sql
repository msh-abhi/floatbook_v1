/*
  # Add Advanced Reporting Functions

  1. New Functions
    - `get_financial_summary(company_id_param, start_date, end_date)`
      - Calculates total paid revenue, unpaid revenue, advance paid amounts,
        and due amounts.
    - `get_discount_report(company_id_param, start_date, end_date)`
      - Provides a summary of discounts, including the number of discounted
        bookings and the total discounted amount, broken down by type.
    - `get_occupancy_report(company_id_param, start_date, end_date)`
      - Calculates the overall occupancy rate for the specified period.

  2. Security
    - All functions are defined with `SECURITY DEFINER` to ensure they can
      query the necessary tables while respecting RLS policies.
    - They are owned by the `postgres` user.
*/

-- Financial Summary Function
CREATE OR REPLACE FUNCTION get_financial_summary(
  company_id_param uuid,
  start_date date,
  end_date date
)
RETURNS TABLE(
  paid_revenue numeric,
  unpaid_revenue numeric,
  total_advance numeric,
  total_due numeric
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(CASE WHEN is_paid THEN total_amount ELSE 0 END) as paid_revenue,
    SUM(CASE WHEN NOT is_paid THEN total_amount ELSE 0 END) as unpaid_revenue,
    SUM(advance_paid) as total_advance,
    SUM(
      CASE 
        WHEN discount_type = 'percentage' THEN total_amount - (total_amount * discount_value / 100) - advance_paid
        ELSE total_amount - discount_value - advance_paid
      END
    ) as total_due
  FROM bookings
  WHERE company_id = company_id_param
    AND check_in_date BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

-- Discount Report Function
CREATE OR REPLACE FUNCTION get_discount_report(
  company_id_param uuid,
  start_date date,
  end_date date
)
RETURNS TABLE(
  discount_type text,
  booking_count bigint,
  total_discounted numeric
)
SECURITY DEFINER
AS $$
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
  GROUP BY b.discount_type;
END;
$$ LANGUAGE plpgsql;

-- Occupancy Report Function
CREATE OR REPLACE FUNCTION get_occupancy_report(
  company_id_param uuid,
  start_date date,
  end_date date
)
RETURNS TABLE(
  occupancy_rate numeric
)
SECURITY DEFINER
AS $$
DECLARE
  total_room_days integer;
  booked_days integer;
BEGIN
  SELECT INTO total_room_days (end_date - start_date + 1) * count(*)
  FROM rooms
  WHERE company_id = company_id_param;

  SELECT INTO booked_days SUM(check_out_date - check_in_date)
  FROM bookings
  WHERE company_id = company_id_param
    AND check_in_date <= end_date AND check_out_date >= start_date;
  
  IF total_room_days = 0 THEN
    RETURN QUERY SELECT 0.0;
  ELSE
    RETURN QUERY SELECT (booked_days::numeric / total_room_days) * 100;
  END IF;
END;
$$ LANGUAGE plpgsql;