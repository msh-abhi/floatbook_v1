/*
  # Add new booking fields and update schema

  1. New Columns
    - `check_in_date` (date, required) - replaces booking_date
    - `check_out_date` (date, required) - defaults to next day
    - `discount_type` (text) - 'fixed' or 'percentage'
    - `discount_value` (numeric) - discount amount or percentage
    - `advance_paid` (numeric) - amount paid in advance

  2. Schema Changes
    - Make customer_email optional
    - Set default values for new fields
    - Migrate existing booking_date to check_in_date
    - Calculate check_out_date as check_in_date + 1 day

  3. Data Migration
    - Preserve existing booking data
    - Set sensible defaults for new fields
*/

-- Add new columns to bookings table
DO $$
BEGIN
  -- Add check_in_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'check_in_date'
  ) THEN
    ALTER TABLE bookings ADD COLUMN check_in_date date;
  END IF;

  -- Add check_out_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'check_out_date'
  ) THEN
    ALTER TABLE bookings ADD COLUMN check_out_date date;
  END IF;

  -- Add discount_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'discount_type'
  ) THEN
    ALTER TABLE bookings ADD COLUMN discount_type text DEFAULT 'fixed';
  END IF;

  -- Add discount_value column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'discount_value'
  ) THEN
    ALTER TABLE bookings ADD COLUMN discount_value numeric DEFAULT 0;
  END IF;

  -- Add advance_paid column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'advance_paid'
  ) THEN
    ALTER TABLE bookings ADD COLUMN advance_paid numeric DEFAULT 0;
  END IF;
END $$;

-- Migrate existing data
UPDATE bookings 
SET 
  check_in_date = booking_date,
  check_out_date = booking_date + INTERVAL '1 day'
WHERE check_in_date IS NULL;

-- Make customer_email optional
ALTER TABLE bookings ALTER COLUMN customer_email DROP NOT NULL;

-- Set NOT NULL constraints for new required fields
ALTER TABLE bookings ALTER COLUMN check_in_date SET NOT NULL;
ALTER TABLE bookings ALTER COLUMN check_out_date SET NOT NULL;

-- Drop the old booking_date column after migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'booking_date'
  ) THEN
    ALTER TABLE bookings DROP COLUMN booking_date;
  END IF;
END $$;