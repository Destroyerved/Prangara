/**
 * PRANGARA mobile companion.
 *
 * Scope (task.md FE-2): capture and quick decisions on a factory floor - camera,
 * bill scanning, equipment scanning, conversational onboarding, quick results,
 * alerts and evidence. The dense analytics stay on the web dashboard (FE-1).
 *
 * Every carbon and financial number shown here comes from the backend's
 * deterministic engine. Nothing in this app computes one.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiError } from './src/api/client';
import { AuthProvider } from './src/auth/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A factory network drops constantly. Retrying a genuinely transient
      // failure is worth it; retrying a 404 or a 403 is not, and burns the
      // user's time while the spinner turns.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && !error.isTransient) return false;
        return failureCount < 2;
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
