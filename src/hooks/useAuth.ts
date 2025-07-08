import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [systemRole, setSystemRole] = useState<string>('user');

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setCompanyId(null);
        setSystemRole('user');
        setLoading(false);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('system_role')
        .eq('id', userId)
        .single();

      if (userError) console.error('Error fetching user data:', userError);
      setSystemRole(userData?.system_role || 'user');

      if (userData?.system_role === 'superadmin') {
        setCompanyId(null);
      } else {
        const { data: companyData, error: companyError } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', userId)
          .single();
        
        if (companyError && companyError.code !== 'PGRST116') {
            console.error('Error fetching user company:', companyError);
        }
        setCompanyId(companyData?.company_id || null);
      }
    } catch (error) {
      console.error('Error in fetchUserData:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshCompany = async () => {
      if(user) {
          await fetchUserData(user.id);
      }
  }

  return {
    user,
    loading,
    companyId,
    systemRole,
    signIn,
    signUp,
    signOut,
    refreshCompany,
  };
}