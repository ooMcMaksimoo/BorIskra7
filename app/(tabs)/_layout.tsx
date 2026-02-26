import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs, router } from 'expo-router';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import { Platform, StyleSheet, View } from 'react-native';
import React, { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="records">
        <Icon sf={{ default: 'list.bullet', selected: 'list.bullet' }} />
        <Label>Записи</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat">
        <Icon sf={{ default: 'message', selected: 'message.fill' }} />
        <Label>Чат</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="products">
        <Icon sf={{ default: 'shippingbox', selected: 'shippingbox.fill' }} />
        <Label>Продукция</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.tabIconDefault,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : Colors.surface,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: Colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.surface }]} />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: 'Rubik_600SemiBold',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="records"
        options={{
          title: 'Записи',
          tabBarIcon: ({ color, size }) =>
            Platform.OS === 'ios' ? (
              <SymbolView name="list.bullet" tintColor={color} size={size} />
            ) : (
              <Ionicons name="list" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Чат',
          tabBarIcon: ({ color, size }) =>
            Platform.OS === 'ios' ? (
              <SymbolView name="message.fill" tintColor={color} size={size} />
            ) : (
              <Ionicons name="chatbubbles" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Продукция',
          tabBarIcon: ({ color, size }) =>
            Platform.OS === 'ios' ? (
              <SymbolView name="shippingbox" tintColor={color} size={size} />
            ) : (
              <Ionicons name="cube-outline" size={size} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { currentUser } = useApp();

  useEffect(() => {
    if (!currentUser) {
      router.replace('/');
    }
  }, [currentUser]);

  if (!currentUser) return null;

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
