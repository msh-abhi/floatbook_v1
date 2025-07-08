/*
  # Create Payment Intents Table for bKash Integration

  1. New Table
    - `payment_intents`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `plan_id` (uuid, references plans)
      - `user_id` (uuid, references users)
      - `amount` (numeric)
      - `currency` (text, default 'BDT')
      - `status` (text, default 'pending')
      - `bkash_payment_id` (text, nullable)
      - `bkash_trx_id` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on payment_intents table
    - Add policies for users to view their own intents
    - Add policies for superadmins to view all intents
*/

-- Create payment_intents table
CREATE TABLE IF NOT EXISTS payment_intents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'BDT',
  status text NOT NULL DEFAULT 'pending',
  bkash_payment_id text,
  bkash_trx_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;

-- Add trigger for updated_at
CREATE TRIGGER update_payment_intents_updated_at
  BEFORE UPDATE ON payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
CREATE POLICY "Users can view their own payment intents"
  ON payment_intents
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR get_system_role(auth.uid()) = 'superadmin'
  );

CREATE POLICY "Users can insert their own payment intents"
  ON payment_intents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR get_system_role(auth.uid()) = 'superadmin'
  );

CREATE POLICY "Users can update their own payment intents"
  ON payment_intents
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR get_system_role(auth.uid()) = 'superadmin'
  );

CREATE POLICY "Superadmins can manage all payment intents"
  ON payment_intents
  FOR ALL
  TO authenticated
  USING (get_system_role(auth.uid()) = 'superadmin')
  WITH CHECK (get_system_role(auth.uid()) = 'superadmin');

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_id ON payment_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_company_id ON payment_intents(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_bkash_payment_id ON payment_intents(bkash_payment_id);