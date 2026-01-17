import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, Image } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  const renderTabIcon = (uri: string, color: string) => (
    <Image
      source={{ uri }}
      style={{ 
        width: 28, 
        height: 28, 
        tintColor: color,
        resizeMode: 'contain'
      }}
    />
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => 
            renderTabIcon('https://img.icons8.com/ios/50/000000/home--v1.png', color),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color }) => 
            renderTabIcon('https://img.icons8.com/ios/50/000000/like--v1.png', color),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => 
            renderTabIcon('https://img.icons8.com/ios/50/000000/chat--v1.png', color),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => 
            renderTabIcon('https://img.icons8.com/ios/50/000000/bell--v1.png', color),
        }}
      />
    </Tabs>
  );
}