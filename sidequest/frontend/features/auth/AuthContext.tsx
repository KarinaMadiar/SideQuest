'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@/types';
import { api, removeToken } from '@/lib/api';
import {
  getCognitoConfig,
  updateCognitoConfig,
  startGoogleCognitoSignIn,
  exchangeCognitoCodeForTokens,
  markLocalAuthSession,
  clearAuthProviderSession,
  getCognitoLogoutUrl,
  CognitoPublicConfig,
} from '@/lib/cognito';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  cognitoConfig: CognitoPublicConfig;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (payload: { email: string; password: string; name: string; role?: string }) => Promise<void>;
  loginWithGoogle: (returnTo?: string) => Promise<void>;
  completeCognitoCallback: (code: string, state: string | null) => Promise<string>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [cognitoConfig, setCognitoConfig] = useState<CognitoPublicConfig>(() => getCognitoConfig());

  // Keep cognito config reactive with backend config if provided
  useEffect(() => {
    api.auth
      .getConfig()
      .then((cfg) => {
        if (cfg && cfg.google_signin_enabled && cfg.client_id && cfg.domain) {
          updateCognitoConfig({
            enabled: true,
            userPoolId: cfg.user_pool_id || '',
            clientId: cfg.client_id,
            domain: cfg.domain,
          });
          setCognitoConfig(getCognitoConfig());
        }
      })
      .catch(() => {});
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.users.getMe();
      setUser(me);
    } catch {
      setUser(null);
      removeToken();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Listen for global 401 unauthorized events so expired tokens clear UI state cleanly
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      clearAuthProviderSession();
    };
    window.addEventListener('sidequest:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('sidequest:unauthorized', handleUnauthorized);
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const res = await api.auth.login(credentials);
    markLocalAuthSession();
    setUser(res.user);
  };

  const register = async (payload: { email: string; password: string; name: string; role?: string }) => {
    const res = await api.auth.register(payload);
    markLocalAuthSession();
    setUser(res.user);
  };

  const loginWithGoogle = async (returnTo = '/') => {
    await startGoogleCognitoSignIn(returnTo);
  };

  const completeCognitoCallback = async (code: string, state: string | null): Promise<string> => {
    const { tokens, returnTo } = await exchangeCognitoCodeForTokens(code, state);
    const syncedUser = await api.auth.syncCognitoSession(tokens.access_token);
    setUser(syncedUser);
    return returnTo || '/';
  };

  const logout = async () => {
    const provider = clearAuthProviderSession();
    await api.auth.logout();
    setUser(null);

    if (provider === 'cognito') {
      const cognitoLogoutUrl = getCognitoLogoutUrl();
      if (cognitoLogoutUrl && typeof window !== 'undefined') {
        window.location.assign(cognitoLogoutUrl);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        cognitoConfig,
        login,
        register,
        loginWithGoogle,
        completeCognitoCallback,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
