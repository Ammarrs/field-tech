import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  // A user can log in to Supabase Auth but still be blocked here if they have no profile
  // or the admin disabled them.
  const resolveProfile = useCallback(async (user) => {
    if (!user) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !data || !data.active) {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      setNotice(
        !data && !error
          ? 'الحساب ده مش متسجل في النظام. كلم الأدمن.'
          : 'الحساب ده موقوف. كلم الأدمن.'
      );
      return;
    }
    setNotice('');
    setProfile(data);
  }, []);

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      await resolveProfile(data.session?.user);
      if (alive) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (event === 'INITIAL_SESSION') return;
      if (event === 'TOKEN_REFRESHED') {
        setSession(s);
        return;
      }
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setProfile(null);
        return;
      }
      if (event === 'SIGNED_IN') {
        setLoading(true);
        setSession(s);
        await resolveProfile(s?.user);
        setLoading(false);
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [resolveProfile]);

  const value = {
    session,
    profile,
    loading,
    notice,
    isAdmin: profile?.role === 'admin',
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error;
    },
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
