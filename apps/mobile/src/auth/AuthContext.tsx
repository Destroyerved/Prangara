/**
 * Session state.
 *
 * Holds the signed-in user and nothing else. Everything about *what* the user
 * can do comes from `me.permissions`, which the backend computes - the app must
 * never decide a permission locally, because a client-side decision is a
 * suggestion, not a rule.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { auth as authApi } from '../api/endpoints';
import { onSignedOut, setActiveOrganization } from '../api/client';
import { clearTokens, loadTokens, saveTokens } from '../storage/tokens';
import type { Me } from '../api/types';

const GUEST_KEY = 'prangara.guestMode';

interface AuthState {
  ready: boolean;
  me: Me | null;
  /**
   * True when the user chose to explore without an account. The app then runs
   * on the bundled demonstration assessment and writes nothing, which is what
   * makes a freshly installed APK usable with no server in reach.
   */
  guest: boolean;
  continueAsGuest: () => Promise<void>;
  leaveGuest: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    full_name: string;
    organization_name: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [guest, setGuest] = useState(false);

  const applyMe = useCallback((next: Me | null) => {
    setMe(next);
    setActiveOrganization(next?.active_organization_id ?? null);
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      applyMe(await authApi.me());
    } catch {
      applyMe(null);
    }
  }, [applyMe]);

  // Restore a session on cold start. A factory owner should not have to sign in
  // every time they open the app to photograph a bill.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if ((await AsyncStorage.getItem(GUEST_KEY)) === 'true' && !cancelled) setGuest(true);
      } catch {
        /* a missing preference is not an error */
      }
      const tokens = await loadTokens();
      if (tokens) {
        try {
          const profile = await authApi.me();
          if (!cancelled) applyMe(profile);
        } catch {
          if (!cancelled) applyMe(null);
        }
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [applyMe]);

  // The client signs us out when a refresh token is rejected outright.
  useEffect(() => onSignedOut(() => applyMe(null)), [applyMe]);

  const continueAsGuest = useCallback(async () => {
    await AsyncStorage.setItem(GUEST_KEY, 'true').catch(() => undefined);
    setGuest(true);
  }, []);

  const leaveGuest = useCallback(async () => {
    await AsyncStorage.removeItem(GUEST_KEY).catch(() => undefined);
    setGuest(false);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const tokens = await authApi.login(email.trim(), password, 'android');
      await saveTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      });
      applyMe(await authApi.me());
      await AsyncStorage.removeItem(GUEST_KEY).catch(() => undefined);
      setGuest(false);
    },
    [applyMe],
  );

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      full_name: string;
      organization_name: string;
    }) => {
      const tokens = await authApi.register({
        ...input,
        email: input.email.trim(),
        organization_kind: 'manufacturer',
      });
      await saveTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      });
      applyMe(await authApi.me());
    },
    [applyMe],
  );

  const signOut = useCallback(async () => {
    const tokens = await loadTokens();
    if (tokens?.refreshToken) {
      // Best effort. Losing the network must not trap the user in a session.
      try {
        await authApi.logout(tokens.refreshToken);
      } catch {
        /* ignore */
      }
    }
    await clearTokens();
    await AsyncStorage.removeItem(GUEST_KEY).catch(() => undefined);
    setGuest(false);
    applyMe(null);
  }, [applyMe]);

  const can = useCallback(
    (permission: string) => Boolean(me?.permissions.includes(permission)),
    [me],
  );

  const value = useMemo<AuthState>(
    () => ({
      ready,
      me,
      guest,
      continueAsGuest,
      leaveGuest,
      signIn,
      register,
      signOut,
      refreshMe,
      can,
    }),
    [ready, me, guest, continueAsGuest, leaveGuest, signIn, register, signOut, refreshMe, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
