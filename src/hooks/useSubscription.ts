import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plan, Subscription } from '../types'; // We'll add Subscription to types next
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
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plans(*)
        `)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }
      
      if (data) {
        // @ts-ignore
        setSubscription(data);
        // @ts-ignore
        setPlan(data.plans);
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