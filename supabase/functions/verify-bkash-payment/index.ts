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

    const { paymentID } = await req.json();
    if (!paymentID) {
      throw new Error('Payment ID is required');
    }

    // Get payment intent
    const { data: paymentIntent, error: intentError } = await supabaseAdmin
      .from('payment_intents')
      .select('*, plans(*)')
      .eq('bkash_payment_id', paymentID)
      .eq('user_id', user.id)
      .single();

    if (intentError || !paymentIntent) {
      throw new Error('Payment intent not found');
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

    // Step 2: Query payment status
    const queryResponse = await fetch('https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/payment/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'authorization': tokenData.id_token,
        'x-app-key': Deno.env.get('BKASH_APP_KEY') ?? '',
      },
      body: JSON.stringify({
        paymentID: paymentID,
      }),
    });

    const queryData = await queryResponse.json();
    
    if (queryData.transactionStatus === 'Completed') {
      // Payment successful - update payment intent
      await supabaseAdmin
        .from('payment_intents')
        .update({
          status: 'completed',
          bkash_trx_id: queryData.trxID,
        })
        .eq('id', paymentIntent.id);

      // Create subscription
      await supabaseAdmin
        .from('subscriptions')
        .insert({
          company_id: paymentIntent.company_id,
          plan_id: paymentIntent.plan_id,
          status: 'active',
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        });

      // Update company plan name
      await supabaseAdmin
        .from('companies')
        .update({ plan_name: paymentIntent.plans.name })
        .eq('id', paymentIntent.company_id);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Payment successful! Your ${paymentIntent.plans.name} plan is now active.`,
          transactionId: queryData.trxID,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      // Payment failed or pending
      await supabaseAdmin
        .from('payment_intents')
        .update({
          status: queryData.transactionStatus?.toLowerCase() || 'failed',
        })
        .eq('id', paymentIntent.id);

      return new Response(
        JSON.stringify({
          success: false,
          message: `Payment ${queryData.transactionStatus || 'failed'}. Please try again.`,
          status: queryData.transactionStatus,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

  } catch (error) {
    console.error('bKash payment verification error:', error);
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