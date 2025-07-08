import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get user from request
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') }
        }
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { plan_id } = await req.json();
    if (!plan_id) {
      throw new Error('Plan ID is required');
    }

    // Get user's company
    const { data: companyUser, error: companyError } = await supabaseAdmin
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (companyError || !companyUser) {
      throw new Error('User not associated with any company');
    }

    // Get plan details
    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      throw new Error('Plan not found');
    }

    // Check if company already has active subscription
    const { data: existingSubscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('company_id', companyUser.company_id)
      .eq('status', 'active')
      .single();

    if (existingSubscription) {
      throw new Error('Company already has an active subscription');
    }

    // Step 1: Get bKash auth token
    const tokenResponse = await fetch('https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/token/grant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'username': Deno.env.get('BKASH_USERNAME') ?? '',
        'password': Deno.env.get('BKASH_PASSWORD') ?? '',
      },
      body: JSON.stringify({
        app_key: Deno.env.get('BKASH_APP_KEY'),
        app_secret: Deno.env.get('BKASH_APP_SECRET'),
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.id_token) {
      throw new Error('Failed to get bKash auth token');
    }

    // Step 2: Create payment intent record
    const { data: paymentIntent, error: intentError } = await supabaseAdmin
      .from('payment_intents')
      .insert({
        company_id: companyUser.company_id,
        plan_id: plan.id,
        user_id: user.id,
        amount: plan.price,
        currency: 'BDT',
        status: 'pending',
      })
      .select()
      .single();

    if (intentError || !paymentIntent) {
      throw new Error('Failed to create payment intent');
    }

    // Step 3: Create bKash payment
    const createPaymentResponse = await fetch('https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'authorization': tokenData.id_token,
        'x-app-key': Deno.env.get('BKASH_APP_KEY') ?? '',
      },
      body: JSON.stringify({
        mode: '0011',
        payerReference: ' ',
        callbackURL: `${Deno.env.get('SUPABASE_SITE_URL')}/bkash/callback`,
        amount: plan.price.toString(),
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: paymentIntent.id,
      }),
    });

    const paymentData = await createPaymentResponse.json();
    if (!paymentData.bkashURL) {
      throw new Error('Failed to create bKash payment: ' + (paymentData.errorMessage || 'Unknown error'));
    }

    // Update payment intent with bKash payment ID
    await supabaseAdmin
      .from('payment_intents')
      .update({ bkash_payment_id: paymentData.paymentID })
      .eq('id', paymentIntent.id);

    return new Response(
      JSON.stringify({
        success: true,
        bkashURL: paymentData.bkashURL,
        paymentID: paymentData.paymentID,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('bKash payment creation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});