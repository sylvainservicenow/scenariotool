'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getSupabase } from './supabase-browser';

const AuthContext = createContext({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Single function to check current user - no listeners, no race conditions
  const checkUser = useCallback(async () => {
    try {
      const sb = getSupabase();
      const { data: { user: u }, error } = await sb.auth.getUser();
      if (error) {
        // Token expired or invalid - clear it
        if (error.message?.includes('token') || error.message?.includes('JWT') || error.status === 401) {
          setUser(null);
        } else {
          console.warn('getUser error:', error.message);
          setUser(null);
        }
      } else {
        setUser(u || null);
      }
    } catch (e) {
      console.warn('checkUser exception:', e);
      setUser(null);
    }
    setLoading(false);
  }, []);

  // Check user on mount
  useEffect(() => {
    checkUser();
  }, [checkUser]);

  const signIn = useCallback(async (email, password) => {
    const sb = getSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setUser(data.user);
    return data;
  }, []);

  const signUp = useCallback(async (email, password, metadata) => {
    const sb = getSupabase();
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
    if (error) throw error;
    setUser(data.user);
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    await sb.auth.signOut();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    await checkUser();
  }, [checkUser]);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
