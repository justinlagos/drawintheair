import React, { createContext, useContext, useState, useEffect } from 'react';
import type { SupabaseUser } from '../lib/supabase';
import {
  handleAuthCallback,
  getUser,
  signInWithGoogle,
  signOut as sbSignOut,
  onAuthStateChange,
  isConfigured,
} from '../lib/supabase';

interface AuthContextValue {
  user: SupabaseUser | null;
  loading: boolean;
  configured: boolean;
  signIn: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  configured: false,
  signIn: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(getUser());
  const [loading, setLoading] = useState(true);
  const configured = isConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    // Handle OAuth callback (if redirected back from Google)
    handleAuthCallback().then((u) => {
      setUser(u);
      setLoading(false);
    });

    // Listen for auth changes
    const unsub = onAuthStateChange((u) => {
      setUser(u);
    });

    return unsub;
  }, [configured]);

  const value: AuthContextValue = {
    user,
    loading,
    configured,
    signIn: signInWithGoogle,
    signOut: async () => {
      await sbSignOut();
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
