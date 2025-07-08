// src/hooks/useAuth.tsx

import { useState, useEffect, createContext, useContext } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Define the shape of your context
interface AuthContextType {
  user: User | null;
  loading: boolean;
  companyId: string | null;
  systemRole: string | null;
  signOut: () => Promise<void>;
  refreshCompany: () => Promise<void>;
}

// Create the context
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Create the provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [systemRole, setSystemRole] = useState<string>('user');

  useEffect(() => {
    const fetchUserData = async (userId: string) => {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('system_role')
          .eq('id', userId)
          .single();
        setSystemRole(userData?.system_role || 'user');

        if (userData?.system_role === 'superadmin') {
          setCompanyId(null);
        } else {
          const { data: companyData } = await supabase
            .from('company_users')
            .select('company_id')
            .eq('user_id', userId)
            .single();
          setCompanyId(companyData?.company_id || null);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchUserData(currentUser.id);
      } else {
        setCompanyId(null);
        setSystemRole('user');
        setLoading(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshCompany = async () => {
    if (user) {
      setLoading(true);
      // Re-fetch all user-related data
      const { data: { session } } = await supabase.auth.getSession();
       if (session?.user) {
        setUser(session.user);
        await fetchUserData(session.user.id);
      }
      setLoading(false);
    }
  };

  const value = { user, loading, companyId, systemRole, signOut, refreshCompany };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Create the custom hook to use the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};