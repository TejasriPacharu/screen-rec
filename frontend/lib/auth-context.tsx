'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from './api';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    setIsAuthenticated(apiClient.isAuthenticated());
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    await apiClient.login(email, password);
    setIsAuthenticated(true);
  };

  const register = async (email: string, password: string) => {
    await apiClient.register(email, password);
    setIsAuthenticated(true);
  };

  const logout = () => {
    apiClient.logout();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}