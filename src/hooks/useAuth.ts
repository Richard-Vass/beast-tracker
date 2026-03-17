'use client';

import { useState, useEffect, useCallback } from 'react';
import { auth } from '@/lib/supabase';

interface AuthUser {
  id: string;
  email: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkUser = useCallback(async () => {
    if (!auth.isAuthenticated()) {
      setUser(null);
      setLoading(false);
      return;
    }
    const { data } = await auth.getUser();
    if (data) {
      setUser(data);
    } else {
      // Try refresh
      const refreshResult = await auth.refreshSession();
      if (refreshResult.data) {
        const { data: userData } = await auth.getUser();
        setUser(userData);
      } else {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  const signIn = async (email: string, password: string) => {
    const result = await auth.signIn(email, password);
    if (result.data?.user) {
      setUser(result.data.user);
    }
    return result;
  };

  const signOut = async () => {
    await auth.signOut();
    setUser(null);
  };

  return { user, loading, signIn, signOut, checkUser };
}
