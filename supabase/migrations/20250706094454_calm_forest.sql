/*
  # Create Subscription System

  1. New Tables
    - `plans`
      - `id` (uuid, primary key)
      - `name` (text)
      - `price` (numeric)
      - `room_limit` (integer)
      - `booking_limit` (integer)
      - `user_limit` (integer)
      - `stripe_price_id` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `subscriptions`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key to companies)
      - `plan_id` (uuid, foreign key to plans)
      - `status` (text)
      - `current_period_end` (timestamp)
      - `stripe_subscription_id` (text, unique, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `activation_keys`
      - `id` (uuid, primary key)
      - `key` (text, unique)
      - `plan_id` (uuid, foreign key to plans)
      - `is_used` (boolean)
      - `used_by_company_id` (uuid, foreign key to companies, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users and superadmin access
    - Create secure activation function

  3. Functions
    - `activate_plan_with_key()` - Secure function to activate plans with keys

  4. Default Data
    - Insert default plans (Free, Basic, Pro)
*/

-- Create plans table
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  room_limit integer NOT NULL DEFAULT 0,
  booking_limit integer NOT NULL DEFAULT 0,
  user_limit integer NOT NULL DEFAULT 1,
  stripe_price_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active',
  current_period_end timestamptz NOT NULL,
  stripe_subscription_id text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create activation_keys table
CREATE TABLE IF NOT EXISTS activation_keys (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text NOT NULL UNIQUE,
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  is_used boolean NOT NULL DEFAULT false,
  used_by_company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activation_keys ENABLE ROW LEVEL SECURITY;

-- Add triggers for updated_at columns
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activation_keys_updated_at
  BEFORE UPDATE ON activation_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for plans table
CREATE POLICY "Plans are readable by all authenticated users"
  ON plans
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only superadmin can insert plans"
  ON plans
  FOR INSERT
  TO authenticated
  WITH CHECK (get_system_role(auth.uid()) = 'superadmin');

CREATE POLICY "Only superadmin can update plans"
  ON plans
  FOR UPDATE
  TO authenticated
  USING (get_system_role(auth.uid()) = 'superadmin')
  WITH CHECK (get_system_role(auth.uid()) = 'superadmin');

CREATE POLICY "Only superadmin can delete plans"
  ON plans
  FOR DELETE
  TO authenticated
  USING (get_system_role(auth.uid()) = 'superadmin');

-- RLS Policies for subscriptions table
CREATE POLICY "Company members and superadmin can read subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = subscriptions.company_id
      AND company_users.user_id = auth.uid()
    )
    OR get_system_role(auth.uid()) = 'superadmin'
  );

CREATE POLICY "Only superadmin can insert subscriptions"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (get_system_role(auth.uid()) = 'superadmin');

CREATE POLICY "Only superadmin can update subscriptions"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (get_system_role(auth.uid()) = 'superadmin')
  WITH CHECK (get_system_role(auth.uid()) = 'superadmin');

CREATE POLICY "Only superadmin can delete subscriptions"
  ON subscriptions
  FOR DELETE
  TO authenticated
  USING (get_system_role(auth.uid()) = 'superadmin');

-- RLS Policies for activation_keys table
CREATE POLICY "Only superadmin can read activation keys"
  ON activation_keys
  FOR SELECT
  TO authenticated
  USING (get_system_role(auth.uid()) = 'superadmin');

CREATE POLICY "Only superadmin can insert activation keys"
  ON activation_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (get_system_role(auth.uid()) = 'superadmin');

CREATE POLICY "Only superadmin can update activation keys"
  ON activation_keys
  FOR UPDATE
  TO authenticated
  USING (get_system_role(auth.uid()) = 'superadmin')
  WITH CHECK (get_system_role(auth.uid()) = 'superadmin');

CREATE POLICY "Only superadmin can delete activation keys"
  ON activation_keys
  FOR DELETE
  TO authenticated
  USING (get_system_role(auth.uid()) = 'superadmin');

-- Create the activate_plan_with_key function
CREATE OR REPLACE FUNCTION activate_plan_with_key(activation_key text)
RETURNS json
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  user_company_id uuid;
  key_record record;
  plan_record record;
  subscription_record record;
  result json;
BEGIN
  -- Get the current authenticated user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Get the user's company
  SELECT company_id INTO user_company_id
  FROM company_users
  WHERE user_id = current_user_id
  LIMIT 1;

  IF user_company_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User is not associated with any company'
    );
  END IF;

  -- Check if the activation key exists and is unused
  SELECT * INTO key_record
  FROM activation_keys
  WHERE key = activation_key AND is_used = false;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or already used activation key'
    );
  END IF;

  -- Get the plan details
  SELECT * INTO plan_record
  FROM plans
  WHERE id = key_record.plan_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Plan not found'
    );
  END IF;

  -- Check if company already has an active subscription
  SELECT * INTO subscription_record
  FROM subscriptions
  WHERE company_id = user_company_id AND status = 'active';

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Company already has an active subscription'
    );
  END IF;

  -- Create the subscription
  INSERT INTO subscriptions (
    company_id,
    plan_id,
    status,
    current_period_end
  ) VALUES (
    user_company_id,
    key_record.plan_id,
    'active',
    now() + interval '30 days'
  ) RETURNING * INTO subscription_record;

  -- Mark the activation key as used
  UPDATE activation_keys
  SET 
    is_used = true,
    used_by_company_id = user_company_id,
    updated_at = now()
  WHERE id = key_record.id;

  -- Return success response
  RETURN json_build_object(
    'success', true,
    'subscription_id', subscription_record.id,
    'plan_name', plan_record.name,
    'expires_at', subscription_record.current_period_end
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'An unexpected error occurred: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- Insert default plans
INSERT INTO plans (name, price, room_limit, booking_limit, user_limit, stripe_price_id) VALUES
  ('Free', 0, 2, 10, 1, NULL),
  ('Basic', 29, 10, 50, 3, NULL),
  ('Pro', 99, -1, -1, 10, NULL)
ON CONFLICT DO NOTHING;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_activation_keys_key ON activation_keys(key);
CREATE INDEX IF NOT EXISTS idx_activation_keys_is_used ON activation_keys(is_used);