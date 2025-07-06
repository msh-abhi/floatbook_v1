/*
  # Add tax settings, amenities, and meal options

  1. New Columns for Companies Table
    - `tax_enabled` (boolean, default false)
    - `tax_rate` (numeric, default 0)

  2. New Columns for Rooms Table
    - `amenities` (text array, default empty array)
    - `meal_options` (text, default 'None')

  3. Security
    - No changes to RLS policies needed as these are just additional data fields
*/

-- Add tax settings to companies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'tax_enabled'
  ) THEN
    ALTER TABLE companies ADD COLUMN tax_enabled boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'tax_rate'
  ) THEN
    ALTER TABLE companies ADD COLUMN tax_rate numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add amenities and meal options to rooms table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rooms' AND column_name = 'amenities'
  ) THEN
    ALTER TABLE rooms ADD COLUMN amenities text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rooms' AND column_name = 'meal_options'
  ) THEN
    ALTER TABLE rooms ADD COLUMN meal_options text DEFAULT 'None';
  END IF;
END $$;