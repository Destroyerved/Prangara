/**
 * Test environment.
 *
 * Native modules the app talks to are stubbed here rather than in each test,
 * so a test file only has to describe the behaviour it is checking.
 */

/* eslint-env node, jest */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
  isAvailableAsync: jest.fn(async () => true),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => () => undefined),
  fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
}));

jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  loadAsync: jest.fn(async () => undefined),
  isLoaded: () => true,
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { hostUri: '127.0.0.1:8081', extra: {} } },
}));

// A test must never reach the network. Any screen that tries is a bug in the
// test, not a slow test.
global.fetch = jest.fn(() =>
  Promise.reject(new Error('Network access is not available in tests.')),
);
