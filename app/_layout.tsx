import { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!navigationState?.key || loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else {
      checkUserRole(session.user.id);
    }
  }, [session, loading, segments, navigationState?.key]);

  const checkUserRole = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (!profile) {
        if (segments[0] !== 'complete-profile') {
          router.replace('/complete-profile');
        }
      } else if (profile.role === 'owner') {
        if (segments[0] !== 'owner') {
          router.replace('/owner');
        }
      } else if (profile.role === 'seeker') {
        const allowedRoots = ['(tabs)', 'seeker'];
        
        
        if (!allowedRoots.includes(segments[0] as string)) {
          router.replace('/(tabs)');
        }
      }
    } catch (e) {
      console.log('Error checking role:', e);
    }
  };

  if (loading || !navigationState?.key) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(tabs)" />
      
   
      <Stack.Screen name="owner/index" />
      <Stack.Screen name="owner/create-listing" />
      <Stack.Screen name="owner/listings" />
      <Stack.Screen name="owner/messages" />
      <Stack.Screen name="owner/analytics" />
      <Stack.Screen name="owner/conversation/[id]" />
      
   
      <Stack.Screen name="seeker/update-location" />
      <Stack.Screen name="seeker/map-view" />
      <Stack.Screen name="seeker/all-listings" />
      
      <Stack.Screen name="seeker/conversation/[id]" />
      
      <Stack.Screen name="complete-profile" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});