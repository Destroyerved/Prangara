/**
 * Native-driver animated primitives for the Prangara Mobile Companion.
 *
 * Built strictly with React Native's native-driver Animated API for 60fps
 * smoothness on Android devices without external heavy animation runtimes.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colour, radius } from '../theme/tokens';

/**
 * Tactile spring pressable wrapper that scales down slightly on press
 * and bounces back on release.
 */
export function SpringPressable({
  children,
  onPress,
  onLongPress,
  disabled,
  style,
  scaleTo = 0.96,
}: {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      friction: 6,
      tension: 100,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 80,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

/**
 * Smooth entry animation: fades in and slides up on mount.
 */
export function FadeSlideView({
  children,
  style,
  delay = 0,
  duration = 320,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  duration?: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, duration, opacity, translateY]);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

/**
 * Animated vertical laser line for camera viewfinders during OCR/VLM scans.
 */
export function LaserScan({
  active = true,
  height = 200,
}: {
  active?: boolean;
  height?: number;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!active) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: height - 12,
            duration: 1600,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.9, duration: 800, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
          ]),
        ]),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 0,
            duration: 1600,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.9, duration: 800, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
          ]),
        ]),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [active, height, opacity, translateY]);

  if (!active) return null;

  return (
    <Animated.View
      style={[
        styles.laserBeam,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.laserGlow} />
    </Animated.View>
  );
}

/**
 * Glowing rhythmic pulse dot for live sync, alerts, and camera targeting.
 */
export function PulseDot({
  color = colour.primary,
  size = 8,
}: {
  color?: string;
  size?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.8,
            duration: 1100,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1100,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.8,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity, scale]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius.pill,
            backgroundColor: color,
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius.pill,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/**
 * Viewfinder 4-corner targeting brackets for camera capture frames.
 */
export function ViewfinderTarget({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.targetContainer, style]}>
      <View style={[styles.corner, styles.topLeft]} />
      <View style={[styles.corner, styles.topRight]} />
      <View style={[styles.corner, styles.bottomLeft]} />
      <View style={[styles.corner, styles.bottomRight]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  laserBeam: {
    height: 3,
    backgroundColor: colour.primary,
    borderRadius: 2,
    shadowColor: colour.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
    marginHorizontal: 8,
  },
  laserGlow: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colour.accent,
    opacity: 0.5,
  },
  targetContainer: {
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(30, 45, 69, 0.6)',
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(14, 23, 38, 0.35)',
  },
  corner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: colour.primary,
  },
  topLeft: {
    top: -1,
    left: -1,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: radius.sm,
  },
  topRight: {
    top: -1,
    right: -1,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: radius.sm,
  },
  bottomLeft: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: radius.sm,
  },
  bottomRight: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: radius.sm,
  },
});
