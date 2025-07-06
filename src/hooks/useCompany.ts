import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Company } from '../types';

export function useCompany(companyId: string | null) {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setCompany(null);
      setLoading(false);
      return;
    }

    fetchCompany();
  }, [companyId]);

  const fetchCompany = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error) {
        console.error('Error fetching company:', error);
      } else {
        setCompany(data);
      }
    } catch (error) {
      console.error('Error fetching company:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCompany = async (updates: Partial<Company>) => {
    if (!companyId) return { error: new Error('No company ID') };

    try {
      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', companyId)
        .select()
        .single();

      if (error) {
        return { error };
      }

      setCompany(data);
      return { data };
    } catch (error) {
      return { error };
    }
  };

  return {
    company,
    loading,
    updateCompany,
    refetch: fetchCompany,
  };
}