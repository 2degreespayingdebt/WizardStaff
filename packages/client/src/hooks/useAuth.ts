import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import type { User, AuthResponse } from '../types';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    const token = api.getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const user = await api.getMe();
      setUser(user);
    } catch {
      api.setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await api.login(email, password);
      const user = await api.getMe();
      setUser(user);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, []);

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      setError(null);
      try {
        await api.register(username, email, password);
        const user = await api.getMe();
        setUser(user);
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    []
  );

  const logout = useCallback(() => {
    api.setToken(null);
    setUser(null);
  }, []);

  return useMemo(
    () => ({
      user,
      loading,
      error,
      login,
      register,
      logout,
    }),
    [user, loading, error, login, register, logout]
  );
}