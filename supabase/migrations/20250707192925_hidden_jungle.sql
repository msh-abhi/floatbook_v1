/*
  # Update Plans with Stripe Price IDs

  1. Purpose
    - Update existing plans with Stripe Price IDs for automated payments
    - These Price IDs should be created in your Stripe Dashboard first

  2. Instructions
    - Replace the price IDs below with actual ones from your Stripe Dashboard
    - Create Products and Prices in Stripe Dashboard before running this migration
    - Test with Stripe test mode first

  3. Security
    - No changes to RLS policies needed
*/

-- Update plans with Stripe Price IDs
-- IMPORTANT: Replace these with your actual Stripe Price IDs from your dashboard

UPDATE plans 
SET stripe_price_id = 'price_1RhpvJ07JeDHYnbEwlW6Xxpk' -- Replace with your actual Basic plan price ID
WHERE name = 'Basic';

UPDATE plans 
SET stripe_price_id = 'price_1Rhpw907JeDHYnbEGxS4hPW6' -- Replace with your actual Pro plan price ID  
WHERE name = 'Pro';

-- The Free plan should remain NULL for stripe_price_id since it's free

-- Add a comment to track when this was updated
COMMENT ON TABLE plans IS 'Updated with Stripe Price IDs on 2025-01-07';