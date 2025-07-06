/*
  # Add user_email column to company_users table

  1. Changes
    - Add `user_email` column to `company_users` table
    - Column is nullable text type to store user email addresses
    - This resolves the "Could not find the 'user_email' column" error

  2. Security
    - No changes to existing RLS policies needed
    - Column follows existing security model
*/

-- Add user_email column to company_users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_users' AND column_name = 'user_email'
  ) THEN
    ALTER TABLE company_users ADD COLUMN user_email text;
  END IF;
END $$;