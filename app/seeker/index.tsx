import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function SeekerHome() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const navigateToNotificationSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('./(tabs)/notifications');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{profile?.name || 'User'}</Text>
          </View>
          <Pressable
            style={styles.avatarContainer}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <Image
              source={{ uri: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f464.svg' }}
              style={styles.avatar}
            />
          </Pressable>
        </View>

        <View style={styles.searchCard}>
          <Image
            source={{ uri: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f50d.svg' }}
            style={styles.searchIcon}
          />
          <Text style={styles.searchPlaceholder}>
            Search for homes near you...
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <Pressable
            style={styles.actionCard}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <View style={styles.actionIconContainer}>
              <Image
                source={{ uri: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f4cd.svg' }}
                style={styles.actionIcon}
              />
            </View>
            <Text style={styles.actionTitle}>Nearby</Text>
            <Text style={styles.actionSubtitle}>Find homes</Text>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <View style={styles.actionIconContainer}>
              <Image
                source={{ uri: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f5fa.svg' }}
                style={styles.actionIcon}
              />
            </View>
            <Text style={styles.actionTitle}>Map View</Text>
            <Text style={styles.actionSubtitle}>Browse map</Text>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <View style={styles.actionIconContainer}>
              <Image
                source={{ uri: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f4b0.svg' }}
                style={styles.actionIcon}
              />
            </View>
            <Text style={styles.actionTitle}>Budget</Text>
            <Text style={styles.actionSubtitle}>Set range</Text>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={navigateToNotificationSettings}
          >
            <View style={styles.actionIconContainer}>
              <Image
                source={{ uri: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f514.svg' }}
                style={styles.actionIcon}
              />
            </View>
            <Text style={styles.actionTitle}>Alerts</Text>
            <Text style={styles.actionSubtitle}>Settings</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Listings</Text>
          <Text style={styles.sectionLink}>See all</Text>
        </View>
        
        <View style={styles.emptyState}>
          <Image
            source={{ uri: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f3d8.svg' }}
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyTitle}>No listings yet</Text>
          <Text style={styles.emptySubtitle}>
            New properties will appear here when owners post them
          </Text>
        </View>
      </View>

      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginTop: 4,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 28,
    height: 28,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: '#9CA3AF',
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  sectionLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    width: 24,
    height: 24,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    marginBottom: 16,
    opacity: 0.8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  signOutButton: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DC2626',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  signOutText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '700',
  },
});