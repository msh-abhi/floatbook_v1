/*
  # Add Superadmin System

  1. Database Changes
    - Add `system_role` column to users table with default 'user'
    - Create function to get system role
    - Update all RLS policies to allow superadmin access

  2. Security
    - Enable RLS on all tables
    - Add superadmin bypass to all existing policies
    - Maintain tenant isolation for regular users
*/

-- Add system_role column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'system_role'
  ) THEN
    ALTER TABLE users ADD COLUMN system_role text DEFAULT 'user';
  END IF;
END $$;

-- Create function to get system role
CREATE OR REPLACE FUNCTION get_system_role(user_id uuid)
RETURNS text
SECURITY DEFINER
AS $$
DECLARE
  role_result text;
BEGIN
  SELECT system_role INTO role_result
  FROM users
  WHERE id = user_id;
  
  RETURN COALESCE(role_result, 'user');
END;
$$ LANGUAGE plpgsql;

-- Update RLS policies for companies table
DROP POLICY IF EXISTS "Enable read access for all users" ON companies;
DROP POLICY IF EXISTS "Company members can update their company" ON companies;
DROP POLICY IF EXISTS "Authenticated users can insert their own company" ON companies;

CREATE POLICY "Enable read access for company members and superadmin"
  ON companies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = companies.id
      AND company_users.user_id = auth.uid()
    )
    OR get_system_role(auth.uid()) = 'superadmin'
  );

CREATE POLICY "Company members and superadmin can update company"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = companies.id
      AND company_users.user_id = auth.uid()
    )
    OR get_system_role(auth.uid()) = 'superadmin'
  );

CREATE POLICY "Authenticated users and superadmin can insert company"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    OR get_system_role(auth.uid()) = 'superadmin'
  );

-- Update RLS policies for company_users table
DROP POLICY IF EXISTS "Users can read their own company_user entry" ON company_users;
DROP POLICY IF EXISTS "Authenticated users can insert their own company_user entry" ON company_users;

CREATE POLICY "Users can read their own company_user entry or superadmin can read all"
  ON company_users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR get_system_role(auth.uid()) = 'superadmin'
  );

CREATE POLICY "Users can insert their own company_user entry or superadmin can insert any"
  ON company_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR get_system_role(auth.uid()) = 'superadmin'
  );

-- Update RLS policies for rooms table
DROP POLICY IF EXISTS "Company members can read rooms of their company" ON rooms;
DROP POLICY IF EXISTS "Company members can insert rooms" ON rooms;
DROP POLICY IF EXISTS "Company members can update rooms" ON rooms;
DROP POLICY IF EXISTS "Company members can delete rooms" ON rooms;

CREATE POLICY "Company members and superadmin can read rooms"
  ON rooms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = rooms.company_id
      AND company_users.user_id = auth.uid()
    )
    OR get_system_role(auth.uid()) = 'superadmin'
  );

CREATE POLICY "Company members and superadmin can insert rooms"
  ON rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = rooms.company_id
      AND company_users.user_id = auth.uid()
    )
    OR get_system_role(auth.uid()) = 'superadmin'
  );

CREATE POLICY "Company members and superadmin can update rooms"
  ON rooms
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = rooms.company_id
      AND company_users.user_id = auth.uid()
    )
    OR get_system_role(auth.uid()) = 'superadmin'
  );

CREATE POLICY "Company members and superadmin can delete rooms"
  ON rooms
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = rooms.company_id
      AND company_users.user_id = auth.uid()
    )
    OR get_system_role(auth.uid()) = 'superadmin'
  );

-- Update RLS policies for bookings table
DROP POLICY IF EXISTS "Company members can read bookings of their company" ON bookings;
DROP POLICY IF EXISTS "Company members can insert bookings" ON bookings;
DROP POLICY IF EXISTS "Company members can update bookings" ON bookings;
DROP POLICY IF EXISTS "Company members can delete bookings" ON bookings;

CREATE POLICY "Company members and superadmin can read bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = bookings.company_id
      AND company_users.user_id = auth.uid()
    )
    OR get_system_role(auth.uid()) = 'superadmin'
  );

CREATE POLICY "Company members and superadmin can insert bookings"
  ON bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = bookings.company_id
      AND company_users.user_id = auth.uid()
    )
    OR get_system_role(auth.uid()) = 'superadmin'
  );

CREATE POLICY "Company members and superadmin can update bookings"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = bookings.company_id
      AND company_users.user_id = auth.uid()
    )
    OR get_system_role(auth.uid()) = 'superadmin'
  );

CREATE POLICY "Company members and superadmin can delete bookings"
  ON bookings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = bookings.company_id
      AND company_users.user_id = auth.uid()
    )
    OR get_system_role(auth.uid()) = 'superadmin'
  );