import type { ReactNode } from 'react';
import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { AUTH_STORAGE_KEY } from '../api/client';


type Role = 'ADMIN' | 'MANAJEMEN' | 'USER';
type UnitBisnis = 'BOSOWA_TAXI' | 'OTORENTAL_NUSANTARA' | 'OTO_GARAGE_INDONESIA' | 'MALLOMO' | 'LAGALIGO_LOGISTIK' | 'PORT_MANAGEMENT';

interface User {
  id: string;
  username: string;
  role: Role;
  unitBisnis?: UnitBisnis | null;
  token: string;
  refreshToken: string;
}

interface AuthContextValue {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  const login = useCallback((next: User) => {
    setUser(next);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  const updateTokens = useCallback((accessToken: string, refreshToken: string) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, token: accessToken, refreshToken };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, login, logout, updateTokens }),
    [user, login, logout, updateTokens],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
