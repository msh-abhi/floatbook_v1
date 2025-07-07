// supabase/functions/stripe-webhook-handler/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature'
};

const stripe = Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(fetch)
});

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !webhookSecret) {
      throw new Error('Missing stripe signature or webhook secret');
    }

    // Verify the webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log('Received Stripe webhook:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription' && session.subscription) {
          // Get the subscription details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const companyId = session.subscription_data?.metadata?.company_id;

          if (!companyId) {
            throw new Error('No company_id found in subscription metadata');
          }

          // Get the plan details from the price
          const priceId = subscription.items.data[0].price.id;
          const { data: plan } = await supabaseAdmin
            .from('plans')
            .select('*')
            .eq('stripe_price_id', priceId)
            .single();

          if (!plan) {
            throw new Error(`No plan found for price ID: ${priceId}`);
          }

          // Create or update the subscription in our database
          const { error: subscriptionError } = await supabaseAdmin
            .from('subscriptions')
            .upsert({
              company_id: companyId,
              plan_id: plan.id,
              status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              stripe_subscription_id: subscription.id
            });

          if (subscriptionError) {
            throw subscriptionError;
          }

          // Update the company's plan_name for quick reference
          const { error: companyError } = await supabaseAdmin
            .from('companies')
            .update({ plan_name: plan.name })
            .eq('id', companyId);

          if (companyError) {
            throw companyError;
          }

          console.log(`Successfully activated ${plan.name} plan for company ${companyId}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.subscription) {
          // Update subscription period end
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          
          const { error } = await supabaseAdmin
            .from('subscriptions')
            .update({
              status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
            })
            .eq('stripe_subscription_id', subscription.id);

          if (error) {
            throw error;
          }

          console.log(`Updated subscription ${subscription.id} after successful payment`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.subscription) {
          const { error } = await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', invoice.subscription as string);

          if (error) {
            throw error;
          }

          console.log(`Marked subscription ${invoice.subscription} as past_due`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Mark subscription as canceled and revert to free plan
        const { data: subscriptionData } = await supabaseAdmin
          .from('subscriptions')
          .select('company_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (subscriptionData) {
          // Update subscription status
          await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'canceled' })
            .eq('stripe_subscription_id', subscription.id);

          // Revert company to free plan
          await supabaseAdmin
            .from('companies')
            .update({ plan_name: 'Free' })
            .eq('id', subscriptionData.company_id);

          console.log(`Canceled subscription for company ${subscriptionData.company_id}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});