# FloatBook - Multi-tenant Booking Management System

A comprehensive SaaS booking management system built with React, TypeScript, and Supabase.

## Features

- **Multi-tenant Architecture**: Secure tenant isolation with Row Level Security
- **Subscription Management**: Flexible plans with Stripe integration
- **Admin Panel**: Superadmin dashboard for managing companies and users
- **Booking Management**: Complete booking lifecycle with calendar view
- **Room Management**: Flexible room configuration with amenities
- **Reports & Analytics**: Comprehensive reporting with filters
- **Tax Management**: Configurable tax settings per company

## Stripe Integration Setup

### 1. Stripe Dashboard Setup

1. **Create a Stripe Account**: Go to [stripe.com](https://stripe.com) and create an account
2. **Create Products and Prices**:
   - Go to Products in your Stripe Dashboard
   - Create a "Basic Plan" product with a $29/month recurring price
   - Create a "Pro Plan" product with a $99/month recurring price
   - Copy the Price IDs (they start with `price_`)

### 2. Environment Variables

Add these to your Supabase project settings (Settings > API):

```bash
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook endpoint secret (see step 4)
SUPABASE_SITE_URL=https://your-app-url.com # Your app's URL
```

### 3. Update Price IDs

1. Open `supabase/migrations/20250707200000_update_plans_with_stripe_prices.sql`
2. Replace the placeholder Price IDs with your actual Stripe Price IDs
3. Run the migration

### 4. Configure Webhooks

1. In your Stripe Dashboard, go to Developers > Webhooks
2. Add endpoint: `https://your-supabase-project.supabase.co/functions/v1/stripe-webhook-handler`
3. Select these events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
4. Copy the webhook signing secret and add it to your environment variables

### 5. Test the Integration

1. Use Stripe's test mode initially
2. Create a test subscription through your app
3. Verify the webhook receives events
4. Check that subscriptions are created in your database

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start Supabase (if running locally)
supabase start
```

## Deployment

1. Deploy your app to your preferred hosting platform
2. Update the `SUPABASE_SITE_URL` environment variable
3. Update Stripe webhook endpoint URL
4. Switch to Stripe live mode when ready

## Database Schema

The app uses the following main tables:
- `companies` - Tenant companies
- `users` - User accounts with system roles
- `company_users` - Many-to-many relationship
- `rooms` - Bookable rooms/resources
- `bookings` - Booking records
- `plans` - Subscription plans
- `subscriptions` - Active subscriptions
- `activation_keys` - Manual activation keys

## Security

- Row Level Security (RLS) enabled on all tables
- Tenant data isolation
- Superadmin role for system management
- Secure webhook handling with signature verification