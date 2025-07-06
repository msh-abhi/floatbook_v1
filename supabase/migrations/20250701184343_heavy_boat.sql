/*
  # Fix infinite recursion in company_users RLS policies

  1. Problem
    - The "Company admins can read all company users" policy creates infinite recursion
    - It queries company_users table within its own policy condition
    - This prevents users from fetching their company information

  2. Solution
    - Drop the problematic recursive policy
    - Keep the simple "Users can read their own company_user entry" policy
    - This allows users to fetch their own company_id without recursion
    - Company admins can still manage users through application logic

  3. Security
    - Users can only read their own company_user records
    - This is sufficient for the useAuth hook to fetch user's company_id
    - Additional admin functionality can be handled at the application level
*/

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Company admins can read all company users" ON company_users;

-- Ensure the non-recursive policy exists and is correct
DROP POLICY IF EXISTS "Users can read their own company_user entry" ON company_users;

CREATE POLICY "Users can read their own company_user entry"
  ON company_users
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);