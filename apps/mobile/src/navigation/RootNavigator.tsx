/**
 * Navigation.
 *
 * Five tabs, because a plant owner on a phone does five things: read the
 * assessment, open a module, capture something, read alerts, manage the
 * account. Every analytical module is a stack screen pushed from the hub, which
 * mirrors the web app's sidebar group for group.
 *
 * The tab bar is the web app's detached floating navbar: a glass pill lifted
 * off the bottom edge rather than a bar welded to it.
 */

import { NavigationContainer, type Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { notifications as notificationsApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import { Loading } from '../components/ui';
import { colour, font, radius, shadow, type as typeScale } from '../theme/tokens';
import { WorkspaceProvider } from '../workspace/WorkspaceContext';

import AccountScreen from '../screens/AccountScreen';
import AlertsScreen from '../screens/AlertsScreen';
import BillScanScreen from '../screens/BillScanScreen';
import CaptureScreen from '../screens/CaptureScreen';
import CircularActionsScreen from '../screens/CircularActionsScreen';
import CircularNetworkScreen from '../screens/CircularNetworkScreen';
import ComplianceScreen from '../screens/ComplianceScreen';
import CreateFactoryScreen from '../screens/CreateFactoryScreen';
import EquipmentScanScreen from '../screens/EquipmentScanScreen';
import EvidenceCaptureScreen from '../screens/EvidenceCaptureScreen';
import FactoryListScreen from '../screens/FactoryListScreen';
import FactoryScreen from '../screens/FactoryScreen';
import FootprintScreen from '../screens/FootprintScreen';
import LeakPointsScreen from '../screens/LeakPointsScreen';
import LogisticsScreen from '../screens/LogisticsScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import MethodologyScreen from '../screens/MethodologyScreen';
import ModulesScreen from '../screens/ModulesScreen';
import OnboardingChatScreen from '../screens/OnboardingChatScreen';
import OverviewScreen from '../screens/OverviewScreen';
import PlantDataScreen from '../screens/PlantDataScreen';
import PortfolioScreen from '../screens/PortfolioScreen';
import QuickResultsScreen from '../screens/QuickResultsScreen';
import ScenariosScreen from '../screens/ScenariosScreen';
import SignInScreen from '../screens/SignInScreen';
import StoryScreen from '../screens/StoryScreen';

import type { RootStackParams, TabParams } from './types';

const Stack = createNativeStackNavigator<RootStackParams>();
const Tabs = createBottomTabNavigator<TabParams>();

const navTheme: Theme = {
  dark: true,
  colors: {
    primary: colour.accent,
    background: colour.bg,
    card: colour.panel,
    text: colour.text,
    border: colour.border,
    notification: colour.critical,
  },
  fonts: {
    regular: { fontFamily: font.body, fontWeight: '400' },
    medium: { fontFamily: font.bodyMedium, fontWeight: '500' },
    bold: { fontFamily: font.headingBold, fontWeight: '700' },
    heavy: { fontFamily: font.headingExtra, fontWeight: '800' },
  },
};

const screenOptions = {
  headerStyle: { backgroundColor: colour.bg },
  headerTintColor: colour.text,
  headerTitleStyle: { ...typeScale.heading, color: colour.text },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colour.bg },
} as const;

type IconName = 'home' | 'hub' | 'capture' | 'alerts' | 'account';

/** Line icons drawn here so the app carries no icon font. */
function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  const stroke = focused ? colour.accentStrong : colour.subtle;
  const width = focused ? 1.9 : 1.5;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
        {name === 'home' ? (
          <>
            <Rect x={3} y={3} width={7.5} height={9} rx={2} stroke={stroke} strokeWidth={width} />
            <Rect x={13.5} y={3} width={7.5} height={5.5} rx={2} stroke={stroke} strokeWidth={width} />
            <Rect x={3} y={15} width={7.5} height={6} rx={2} stroke={stroke} strokeWidth={width} />
            <Rect x={13.5} y={11.5} width={7.5} height={9.5} rx={2} stroke={stroke} strokeWidth={width} />
          </>
        ) : null}
        {name === 'hub' ? (
          <>
            <Path d="M4 7h16" stroke={stroke} strokeWidth={width} strokeLinecap="round" />
            <Path d="M4 12h16" stroke={stroke} strokeWidth={width} strokeLinecap="round" />
            <Path d="M4 17h16" stroke={stroke} strokeWidth={width} strokeLinecap="round" />
            <Circle cx={8} cy={7} r={1.9} fill={stroke} />
            <Circle cx={15} cy={12} r={1.9} fill={stroke} />
            <Circle cx={11} cy={17} r={1.9} fill={stroke} />
          </>
        ) : null}
        {name === 'capture' ? (
          <>
            <Path
              d="M3.5 8.5A2 2 0 0 1 5.5 6.5h1.8l1.2-2h6l1.2 2h1.8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-8Z"
              stroke={stroke}
              strokeWidth={width}
              strokeLinejoin="round"
            />
            <Circle cx={12} cy={12.6} r={3.4} stroke={stroke} strokeWidth={width} />
          </>
        ) : null}
        {name === 'alerts' ? (
          <>
            <Path
              d="M6.5 10a5.5 5.5 0 0 1 11 0c0 3.2.8 5 1.5 6h-14c.7-1 1.5-2.8 1.5-6Z"
              stroke={stroke}
              strokeWidth={width}
              strokeLinejoin="round"
            />
            <Path d="M10 19a2.2 2.2 0 0 0 4 0" stroke={stroke} strokeWidth={width} strokeLinecap="round" />
          </>
        ) : null}
        {name === 'account' ? (
          <>
            <Circle cx={12} cy={8.5} r={3.6} stroke={stroke} strokeWidth={width} />
            <Path
              d="M5 20c.7-3.4 3.6-5.4 7-5.4s6.3 2 7 5.4"
              stroke={stroke}
              strokeWidth={width}
              strokeLinecap="round"
            />
          </>
        ) : null}
      </Svg>
    </View>
  );
}

function AlertsIcon({ focused }: { focused: boolean }) {
  const { data } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationsApi.list(true),
    refetchInterval: 60_000,
    retry: false,
  });
  return (
    <View>
      <TabIcon name="alerts" focused={focused} />
      {data?.length ? (
        <View
          style={{
            position: 'absolute',
            top: -3,
            right: -6,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            paddingHorizontal: 4,
            backgroundColor: colour.critical,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ ...typeScale.micro, fontSize: 9, color: colour.bg }}>
            {data.length > 9 ? '9+' : data.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function TabNavigator() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colour.bg },
        tabBarStyle: {
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 12,
          height: 62,
          paddingTop: 8,
          paddingBottom: 8,
          borderRadius: radius.pill,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colour.floatingBorder,
          backgroundColor: 'rgba(10, 11, 13, 0.96)',
          ...shadow.floating,
        },
        tabBarActiveTintColor: colour.accentStrong,
        tabBarInactiveTintColor: colour.subtle,
        tabBarLabelStyle: { ...typeScale.micro, fontSize: 9.5, letterSpacing: 0.3 },
      }}
    >
      <Tabs.Screen
        name="Home"
        component={OverviewScreen}
        options={{
          title: 'Overview',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="Hub"
        component={ModulesScreen}
        options={{
          title: 'Modules',
          tabBarIcon: ({ focused }) => <TabIcon name="hub" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="Capture"
        component={CaptureScreen}
        options={{
          title: 'Capture',
          tabBarIcon: ({ focused }) => <TabIcon name="capture" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          title: 'Alerts',
          tabBarIcon: ({ focused }) => <AlertsIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: 'Account',
          tabBarIcon: ({ focused }) => <TabIcon name="account" focused={focused} />,
        }}
      />
    </Tabs.Navigator>
  );
}

export default function RootNavigator() {
  const { ready, me, guest } = useAuth();

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colour.bg, justifyContent: 'center' }}>
        <Loading label="PRANGARA" />
      </View>
    );
  }

  if (!me && !guest) {
    return (
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Tabs" component={SignInScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <WorkspaceProvider>
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />

          <Stack.Screen
            name="PlantData"
            component={PlantDataScreen}
            options={{ title: 'Plant data' }}
          />
          <Stack.Screen
            name="Footprint"
            component={FootprintScreen}
            options={{ title: 'Footprint' }}
          />
          <Stack.Screen
            name="LeakPoints"
            component={LeakPointsScreen}
            options={{ title: 'Leak points' }}
          />
          <Stack.Screen
            name="Scenarios"
            component={ScenariosScreen}
            options={{ title: 'What-if simulator' }}
          />
          <Stack.Screen
            name="CircularActions"
            component={CircularActionsScreen}
            options={{ title: 'Circular actions' }}
          />
          <Stack.Screen
            name="Portfolio"
            component={PortfolioScreen}
            options={{ title: 'Abatement portfolio' }}
          />
          <Stack.Screen
            name="Marketplace"
            component={MarketplaceScreen}
            options={{ title: 'Marketplace & RFQs' }}
          />
          <Stack.Screen
            name="Logistics"
            component={LogisticsScreen}
            options={{ title: 'Green logistics' }}
          />
          <Stack.Screen
            name="CircularNetwork"
            component={CircularNetworkScreen}
            options={{ title: 'Circular network' }}
          />
          <Stack.Screen
            name="Compliance"
            component={ComplianceScreen}
            options={{ title: 'Compliance' }}
          />
          <Stack.Screen
            name="Methodology"
            component={MethodologyScreen}
            options={{ title: 'Methodology' }}
          />
          <Stack.Screen name="Story" component={StoryScreen} options={{ title: 'Walkthrough' }} />

          <Stack.Screen
            name="Factories"
            component={FactoryListScreen}
            options={{ title: 'Your plants' }}
          />
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
      </WorkspaceProvider>
    </NavigationContainer>
  );
}
