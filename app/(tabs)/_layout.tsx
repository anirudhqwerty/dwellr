import { Tabs } from 'expo-router';
import React from 'react';
import { Image } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Image
              source={{ 
                uri: focused 
                  ? 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f3e0.svg'
                  : 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f3e0.svg'
              }}
              style={{ width: 24, height: 24, opacity: focused ? 1 : 0.5 }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color, focused }) => (
            <Image
              source={{ 
                uri: focused
                  ? 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/2764.svg'
                  : 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f90d.svg'
              }}
              style={{ width: 24, height: 24, opacity: focused ? 1 : 0.5 }}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tabs>
  );
}