/**
 * PRANGARA mobile companion.
 *
 * Feature parity with the web dashboard (FE-1) on a phone: the same modules,
 * the same design system and the same engine figures, plus the things only a
 * phone can do - camera intake, offline capture and a queue that drains when
 * the network comes back.
 *
 * Every carbon and financial number shown here comes from the backend's
 * deterministic engine, or from the bundled engine demonstration payload.
 * Nothing in this app computes one.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiError, restoreCustomBaseUrl } from './src/api/client';
import { AuthProvider } from './src/auth/AuthContext';
import { Loading } from './src/components/ui';
import RootNavigator from './src/navigation/RootNavigator';
import { drain, startAutoSync } from './src/storage/sync';
import { colour } from './src/theme/tokens';

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
  // Manrope for titles and numbers, Inter for prose: the web app's ramp.
  const [fontsLoaded] = useFonts({
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // A stored endpoint has to be in place before the first request, or the app
  // spends its first seconds talking to the wrong server.
  const [endpointReady, setEndpointReady] = useState(false);
  useEffect(() => {
    restoreCustomBaseUrl()
      .catch(() => undefined)
      .finally(() => setEndpointReady(true));
  }, []);

  useEffect(() => {
    // Anything captured while offline goes up on the next connectivity
    // transition, and once on cold start in case the app was killed while
    // items were still waiting.
    drain();
    return startAutoSync();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        {fontsLoaded && endpointReady ? (
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        ) : (
          <View style={{ flex: 1, backgroundColor: colour.bg, justifyContent: 'center' }}>
            <Loading label="PRANGARA" />
          </View>
        )}
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
