'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSupabase } from './supabase-browser';

const AuthContext = createContext({ user: null, profile: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return null;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) {
        console.warn('Profile fetch failed:', error.message);
        return null;
      }
      return data;
    } catch (e) {
      console.warn('Profile fetch error:', e);
      return null;
    }
  }, []);

  // Initial session check - runs once
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const supabase = getSupabase();
        const { data: { session }, error } = await supabase.auth.getSession();
        if (cancelled) return;

        if (error || !session?.user) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        setUser(session.user);
        const p = await fetchProfile(session.user.id);
        if (!cancelled) {
          setProfile(p);
          setLoading(false);
        }
      } catch (e) {
        console.warn('Auth init error:', e);
        if (!cancelled) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    init();

    // Listen for auth state changes (login, logout, token refresh)
    const supabase = getSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;

        const u = session?.user ?? null;
        setUser(u);

        if (u) {
          const p = await fetchProfile(u.id);
          if (!cancelled) setProfile(p);
        } else {
          setProfile(null);
        }

        // Always ensure loading is false after any auth event
        if (!cancelled) setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
