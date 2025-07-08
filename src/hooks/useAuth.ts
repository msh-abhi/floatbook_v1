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
  refreshCompany: () => Promise<void>; // This is the new function to export
}

// Create the context
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Create the provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [systemRole, setSystemRole] = useState<string>('user');

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
  
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;
      setUser(currentUser ?? null);
      if (currentUser) {
        await fetchUserData(currentUser.id);
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
  
  // --- This function allows other components to manually trigger a data refresh ---
  const refreshCompany = async () => {
    if (user) {
      setLoading(true); // Set loading to true to indicate a refresh is happening
      await fetchUserData(user.id);
    }
  };

  const value = {
    user,
    loading,
    companyId,
    systemRole,
    signOut,
    refreshCompany, // Export the function
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// The custom hook to consume the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};