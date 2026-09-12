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

import { PulseDot } from '../components/animations';

/**
 * Polished, dependency-free bespoke tab icons matching web platform visual language.
 */
function FactoryTabIcon({ focused }: { focused: boolean }) {
  const iconColor = focused ? colour.primary : colour.textFaint;
  return (
    <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 18,
          height: 14,
          borderWidth: 1.8,
          borderColor: iconColor,
          borderRadius: 3,
          backgroundColor: focused ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'flex-end',
          paddingBottom: 2,
        }}
      >
        <View style={{ width: 3, height: 6, backgroundColor: iconColor, borderRadius: 1 }} />
        <View style={{ width: 3, height: 8, backgroundColor: iconColor, borderRadius: 1 }} />
      </View>
      {focused ? <View style={styles.activeDot} /> : null}
    </View>
  );
}

function ScanTabIcon({ focused }: { focused: boolean }) {
  const iconColor = focused ? colour.primary : colour.textFaint;
  return (
    <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 18,
          height: 18,
          borderWidth: 1.8,
          borderColor: iconColor,
          borderRadius: 5,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: focused ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
        }}
      >
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: iconColor,
          }}
        />
      </View>
      {focused ? <View style={styles.activeDot} /> : null}
    </View>
  );
}

function AlertsTabIcon({ focused }: { focused: boolean }) {
  const { data } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationsApi.list(true),
    refetchInterval: 60_000,
  });
  const iconColor = focused ? colour.primary : colour.textFaint;
  const count = data?.length ?? 0;

  return (
    <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 16,
          height: 16,
          borderWidth: 1.8,
          borderColor: iconColor,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          borderBottomLeftRadius: 2,
          borderBottomRightRadius: 2,
          backgroundColor: focused ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
        }}
      />
      {count > 0 ? (
        <View style={styles.alertBadge}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: '#FFF' }}>
            {count > 9 ? '9+' : count}
          </Text>
        </View>
      ) : null}
      {focused && count === 0 ? <View style={styles.activeDot} /> : null}
    </View>
  );
}

function AccountTabIcon({ focused }: { focused: boolean }) {
  const iconColor = focused ? colour.primary : colour.textFaint;
  return (
    <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 16,
          height: 16,
          borderRadius: 8,
          borderWidth: 1.8,
          borderColor: iconColor,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: focused ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
        }}
      >
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: iconColor }} />
      </View>
      {focused ? <View style={styles.activeDot} /> : null}
    </View>
  );
}

const styles = {
  activeDot: {
    position: 'absolute' as const,
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colour.primary,
  },
  alertBadge: {
    position: 'absolute' as const,
    top: -3,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colour.critical,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 3,
  },
};

function TabNavigator() {
  return (
    <Tabs.Navigator
      screenOptions={{
        ...screenOptions,
        tabBarStyle: {
          backgroundColor: colour.surface,
          borderTopColor: colour.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colour.primary,
        tabBarInactiveTintColor: colour.textFaint,
        tabBarLabelStyle: { ...typeScale.micro, marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="Factories"
        component={FactoryListScreen}
        options={{
          title: 'Factories',
          headerShown: false,
          tabBarIcon: ({ focused }) => <FactoryTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="Capture"
        component={CaptureScreen}
        options={{
          title: 'Capture',
          headerShown: false,
          tabBarIcon: ({ focused }) => <ScanTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          title: 'Alerts',
          headerShown: false,
          tabBarIcon: ({ focused }) => <AlertsTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: 'Account',
          headerShown: false,
          tabBarIcon: ({ focused }) => <AccountTabIcon focused={focused} />,
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
