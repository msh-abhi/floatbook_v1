-- Step 1: Clean up any partially created tables to ensure a fresh start.
DROP TABLE IF EXISTS public.activation_keys;
DROP TABLE IF EXISTS public.subscriptions;
DROP TABLE IF EXISTS public.plans;

-- Step 2: Re-create all tables with the correct schema.

-- Create the plans table
CREATE TABLE public.plans (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    price numeric NOT NULL,
    room_limit integer NOT NULL,
    booking_limit integer NOT NULL,
    user_limit integer NOT NULL,
    stripe_price_id text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create the subscriptions table
CREATE TABLE public.subscriptions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'active',
    current_period_end timestamptz NOT NULL,
    stripe_subscription_id text UNIQUE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create the activation_keys table
CREATE TABLE public.activation_keys (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    key text NOT NULL UNIQUE,
    plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    is_used boolean NOT NULL DEFAULT false,
    used_by_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
    used_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add a plan_name to companies for quick UI checks
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS plan_name text DEFAULT 'Free';

-- Create indexes for performance
CREATE INDEX ON public.subscriptions (company_id);
CREATE INDEX ON public.activation_keys (key);

-- Step 3: Enable Row Level Security (RLS) and define policies.

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to read plans" ON public.plans
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow company members to read their subscriptions" ON public.subscriptions
  FOR SELECT USING ((EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.company_id = subscriptions.company_id AND cu.user_id = auth.uid()
  )) OR get_system_role(auth.uid()) = 'superadmin');

CREATE POLICY "Allow superadmins to manage activation keys" ON public.activation_keys
  FOR ALL USING (get_system_role(auth.uid()) = 'superadmin');

CREATE POLICY "Allow superadmins to manage plans" ON public.plans
  FOR ALL USING (get_system_role(auth.uid()) = 'superadmin')
  WITH CHECK (get_system_role(auth.uid()) = 'superadmin');
  
CREATE POLICY "Allow superadmins to manage subscriptions" ON public.subscriptions
  FOR ALL USING (get_system_role(auth.uid()) = 'superadmin')
  WITH CHECK (get_system_role(auth.uid()) = 'superadmin');

-- Step 4: Create the activation key function.

CREATE OR REPLACE FUNCTION public.activate_plan_with_key(activation_key text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  key_record record;
  plan_record record;
  company_id uuid;
  active_subscription record;
BEGIN
  SELECT cu.company_id INTO company_id
  FROM public.company_users cu
  WHERE cu.user_id = auth.uid()
  LIMIT 1;

  IF company_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'You are not part of any company.');
  END IF;

  SELECT * INTO active_subscription
  FROM public.subscriptions s
  WHERE s.company_id = company_id AND s.status = 'active';

  IF active_subscription IS NOT NULL THEN
    RETURN json_build_object('success', false, 'message', 'Your company already has an active subscription.');
  END IF;

  SELECT * INTO key_record
  FROM public.activation_keys
  WHERE key = activation_key;

  IF key_record IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'The provided activation key is invalid.');
  END IF;

  IF key_record.is_used = true THEN
    RETURN json_build_object('success', false, 'message', 'This activation key has already been used.');
  END IF;

  SELECT * INTO plan_record
  FROM public.plans
  WHERE id = key_record.plan_id;

  INSERT INTO public.subscriptions (company_id, plan_id, status, current_period_end)
  VALUES (company_id, key_record.plan_id, 'active', now() + interval '30 days');

  UPDATE public.activation_keys
  SET 
    is_used = true,
    used_by_company_id = company_id,
    used_at = now()
  WHERE id = key_record.id;

  UPDATE public.companies
  SET plan_name = plan_record.name
  WHERE id = company_id;

  RETURN json_build_object('success', true, 'message', 'Plan activated successfully! You are now on the ' || plan_record.name || ' plan.');
END;
$$;

-- Step 5: Insert the default plans.

INSERT INTO public.plans (name, price, room_limit, booking_limit, user_limit)
VALUES
  ('Free', 0, 2, 20, 1),
  ('Pro', 19, 15, 200, 5),
  ('Business', 49, -1, -1, -1);