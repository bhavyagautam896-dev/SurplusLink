import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getErrorMessage } from '../api/client';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const checkMe = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success && res.data.data.user) {
        setUser(res.data.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
      localStorage.removeItem('surpluslink_token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkMe();
  }, []);

  const login = async (credentials: any) => {
    const res = await api.post('/auth/login', credentials);
    if (res.data.success) {
      setUser(res.data.data.user);
      if (res.data.data.token) {
        localStorage.setItem('surpluslink_token', res.data.data.token);
      }
    }
  };

  const register = async (data: any) => {
    const res = await api.post('/auth/register', data);
    if (res.data.success) {
      setUser(res.data.data.user);
      if (res.data.data.token) {
        localStorage.setItem('surpluslink_token', res.data.data.token);
      }
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Continue cleanup on frontend
    } finally {
      setUser(null);
      localStorage.removeItem('surpluslink_token');
    }
  };

  const refreshUser = async () => {
    await checkMe();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
