/*
  # Add referred_by field to bookings table

  1. Changes
    - Add `referred_by` column to `bookings` table
    - Column is nullable to allow existing bookings without this field

  2. Security
    - No changes to RLS policies needed as this is just an additional data field
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'referred_by'
  ) THEN
    ALTER TABLE bookings ADD COLUMN referred_by text;
  END IF;
END $$;