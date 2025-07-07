import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plan, Subscription } from '../types';
import { useAuth } from './useAuth';

interface SubscriptionData {
  subscription: Subscription | null;
  plan: Plan | null;
  loading: boolean;
  has_active_subscription: boolean;
}

export function useSubscription(): SubscriptionData {
  const { companyId } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) {
      fetchSubscription();
    } else {
      setLoading(false);
    }
  }, [companyId]);

  const fetchSubscription = async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      // Fetch the most recent active subscription
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plans(*)
        `)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }
      
      if (data) {
        setSubscription(data);
        setPlan(data.plans as Plan);
      } else {
        // If no active subscription, fetch the default 'Free' plan
        const { data: freePlan, error: freePlanError } = await supabase
          .from('plans')
          .select('*')
          .eq('name', 'Free')
          .single();
        
        if (freePlanError) throw freePlanError;
        setPlan(freePlan);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  return { 
    subscription, 
    plan, 
    loading,
    has_active_subscription: !!subscription 
  };
}