// supabase/functions/create-stripe-checkout/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno';
// The CORS headers are now placed directly inside the function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const stripe = Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(fetch)
});
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('User not found.');
    const { data: companyUser, error: companyErr } = await supabaseClient.from('company_users').select('company_id').eq('user_id', user.id).single();
    if (companyErr) throw companyErr;
    const { price_id } = await req.json();
    if (!price_id) throw new Error('A `price_id` is required.');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: [
        'card'
      ],
      line_items: [
        {
          price: price_id,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${Deno.env.get('SUPABASE_SITE_URL')}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get('SUPABASE_SITE_URL')}/settings?tab=plans&canceled=true`,
      subscription_data: {
        metadata: {
          company_id: companyUser.company_id
        }
      }
    });
    return new Response(JSON.stringify({
      checkout_url: session.url
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
