'use client';

// frontend/src/lib/auth-context.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, User } from './api';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  loginWithGoogle: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading]             = useState(true);
  const [user, setUser]                       = useState<User | null>(null);

  useEffect(() => {
    const init = async () => {
      if (!apiClient.isAuthenticated()) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await apiClient.getMe();
        setUser(me);
        setIsAuthenticated(true);
      } catch {
        // Token invalid / expired — clear it
        apiClient.logout();
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const loginWithGoogle = () => apiClient.loginWithGoogle();

  const logout = () => {
    apiClient.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}