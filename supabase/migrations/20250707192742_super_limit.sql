/*
  # Add Admin Management Features

  1. New Columns
    - Add `is_active` column to `companies` table (if not exists)
    - Add `is_active` column to `users` table (if not exists)

  2. Purpose
    - Allow superadmin to enable/disable companies
    - Allow superadmin to enable/disable users
    - Provides account management capabilities

  3. Security
    - No changes to RLS policies needed as these are just additional data fields
    - Access control handled at application level
*/

-- Add is_active column to companies table (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE companies ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Add is_active column to users table (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE users ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;