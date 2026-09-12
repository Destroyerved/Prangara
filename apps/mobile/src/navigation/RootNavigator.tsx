/**
 * Navigation.
 *
 * Four tabs, because a factory owner on a phone does four things: look at their
 * plants, capture something, read alerts, manage the account. Everything else is
 * a stack screen pushed from one of those.
 */

import { NavigationContainer, type Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { Text, View } from 'react-native';

import { notifications as notificationsApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import { Loading } from '../components/ui';
import { colour, type as typeScale } from '../theme/tokens';

import AccountScreen from '../screens/AccountScreen';
import AlertsScreen from '../screens/AlertsScreen';
import BillScanScreen from '../screens/BillScanScreen';
import CaptureScreen from '../screens/CaptureScreen';
import CreateFactoryScreen from '../screens/CreateFactoryScreen';
import EquipmentScanScreen from '../screens/EquipmentScanScreen';
import EvidenceCaptureScreen from '../screens/EvidenceCaptureScreen';
import FactoryListScreen from '../screens/FactoryListScreen';
import FactoryScreen from '../screens/FactoryScreen';
import OnboardingChatScreen from '../screens/OnboardingChatScreen';
import QuickResultsScreen from '../screens/QuickResultsScreen';
import SignInScreen from '../screens/SignInScreen';

import type { RootStackParams, TabParams } from './types';

const Stack = createNativeStackNavigator<RootStackParams>();
const Tabs = createBottomTabNavigator<TabParams>();

const navTheme: Theme = {
  dark: true,
  colors: {
    primary: colour.primary,
    background: colour.bg,
    card: colour.surface,
    text: colour.text,
    border: colour.border,
    notification: colour.critical,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  },
};

const screenOptions = {
  headerStyle: { backgroundColor: colour.surface },
  headerTintColor: colour.text,
  headerTitleStyle: { ...typeScale.heading },
  contentStyle: { backgroundColor: colour.bg },
} as const;

function TabGlyph({ glyph, focused }: { glyph: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text
        style={{
          fontSize: 19,
          color: focused ? colour.primary : colour.textFaint,
          fontWeight: focused ? '700' : '400',
        }}
      >
        {glyph}
      </Text>
      {focused ? (
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: colour.primary,
            marginTop: 2,
          }}
        />
      ) : null}
    </View>
  );
}

function UnreadDot({ focused }: { focused: boolean }) {
  const { data } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationsApi.list(true),
    refetchInterval: 60_000,
  });
  if (!data?.length) return <TabGlyph glyph="!" focused={focused} />;
  return (
    <View
      style={{
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        paddingHorizontal: 5,
        backgroundColor: colour.critical,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ ...typeScale.micro, color: colour.text, fontWeight: '700' }}>
        {data.length > 9 ? '9+' : data.length}
      </Text>
    </View>
  );
}

function TabNavigator() {
  return (
    <Tabs.Navigator
      screenOptions={{
        ...screenOptions,
        tabBarStyle: {
          backgroundColor: '#080B11',
          borderTopColor: '#1E293B',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colour.primary,
        tabBarInactiveTintColor: colour.textFaint,
        tabBarLabelStyle: { ...typeScale.micro, fontWeight: '600', marginTop: 1 },
      }}
    >
      <Tabs.Screen
        name="Factories"
        component={FactoryListScreen}
        options={{
          title: 'Factories',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabGlyph glyph="🏢" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="Capture"
        component={CaptureScreen}
        options={{
          title: 'Capture',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabGlyph glyph="📷" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          title: 'Alerts',
          headerShown: false,
          tabBarIcon: ({ focused }) => <UnreadDot focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: 'Account',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabGlyph glyph="⚙️" focused={focused} />,
        }}
      />
    </Tabs.Navigator>
  );
}

export default function RootNavigator() {
  const { ready, me } = useAuth();

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colour.bg, justifyContent: 'center' }}>
        <Loading label="PRANGARA" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {me ? (
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
          <Stack.Screen
            name="CreateFactory"
            component={CreateFactoryScreen}
            options={{ title: 'Add a factory' }}
          />
          <Stack.Screen
            name="Factory"
            component={FactoryScreen}
            options={({ route }) => ({ title: route.params.factoryName })}
          />
          <Stack.Screen
            name="Onboarding"
            component={OnboardingChatScreen}
            options={{ title: 'Describe your plant' }}
          />
          <Stack.Screen
            name="BillScan"
            component={BillScanScreen}
            options={{ title: 'Scan a bill' }}
          />
          <Stack.Screen
            name="EquipmentScan"
            component={EquipmentScanScreen}
            options={{ title: 'Add equipment' }}
          />
          <Stack.Screen
            name="EvidenceCapture"
            component={EvidenceCaptureScreen}
            options={{ title: 'File a document' }}
          />
          <Stack.Screen
            name="QuickResults"
            component={QuickResultsScreen}
            options={{ title: 'Results' }}
          />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Tabs" component={SignInScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
