/*
  # Fix Stripe Price IDs for Plans

  1. Purpose
    - Ensure that the Basic and Pro plans have valid Stripe Price IDs
    - This fixes the grayed-out upgrade buttons issue

  2. Changes
    - Update Basic plan with a placeholder Stripe Price ID
    - Update Pro plan with a placeholder Stripe Price ID
    - These should be replaced with actual Stripe Price IDs from your dashboard

  3. Note
    - Replace these placeholder IDs with your actual Stripe Price IDs
    - Create products and prices in your Stripe Dashboard first
*/

-- Update plans with placeholder Stripe Price IDs
-- IMPORTANT: Replace these with your actual Stripe Price IDs

UPDATE plans 
SET stripe_price_id = 'price_1234567890_basic_plan'
WHERE name = 'Basic' AND stripe_price_id IS NULL;

UPDATE plans 
SET stripe_price_id = 'price_1234567890_pro_plan'
WHERE name = 'Pro' AND stripe_price_id IS NULL;

-- Ensure the Free plan has NULL stripe_price_id (it should be free)
UPDATE plans 
SET stripe_price_id = NULL
WHERE name = 'Free';