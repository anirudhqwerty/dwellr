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
import { LinearGradient } from 'expo-linear-gradient';

export default function OwnerHome() {
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

  const navigateToCreateListing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('./owner/create-listing');
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
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.name}>{profile?.name || 'Owner'}</Text>
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

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Active Listings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Total Views</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Interested</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Pressable
          style={({ pressed }) => [
            styles.createButton,
            pressed && styles.createButtonPressed,
          ]}
          onPress={navigateToCreateListing}
        >
          <LinearGradient
            colors={['#007AFF', '#0051D5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.createGradient}
          >
            <Image
              source={{ uri: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/2795.svg' }}
              style={styles.createIcon}
            />
            <Text style={styles.createText}>Create New Listing</Text>
          </LinearGradient>
        </Pressable>
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
                source={{ uri: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f4cb.svg' }}
                style={styles.actionIcon}
              />
            </View>
            <Text style={styles.actionTitle}>My Listings</Text>
            <Text style={styles.actionSubtitle}>View all</Text>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <View style={styles.actionIconContainer}>
              <Image
                source={{ uri: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f4ca.svg' }}
                style={styles.actionIcon}
              />
            </View>
            <Text style={styles.actionTitle}>Analytics</Text>
            <Text style={styles.actionSubtitle}>View stats</Text>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <View style={styles.actionIconContainer}>
              <Image
                source={{ uri: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f4ac.svg' }}
                style={styles.actionIcon}
              />
            </View>
            <Text style={styles.actionTitle}>Messages</Text>
            <Text style={styles.actionSubtitle}>0 new</Text>
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
            <Text style={styles.actionTitle}>Notifications</Text>
            <Text style={styles.actionSubtitle}>Settings</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Listings</Text>
          <Text style={styles.sectionLink}>See all</Text>
        </View>
        
        <View style={styles.emptyState}>
          <Image
            source={{ uri: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f3e1.svg' }}
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyTitle}>No listings yet</Text>
          <Text style={styles.emptySubtitle}>
            Create your first listing to start connecting with seekers
          </Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Image
          source={{ uri: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f4de.svg' }}
          style={styles.infoIcon}
        />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Contact Number</Text>
          <Text style={styles.infoText}>{profile?.phone || 'Not set'}</Text>
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
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  section: {
    padding: 20,
  },
  createButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  createButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  createIcon: {
    width: 24,
    height: 24,
  },
  createText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
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
  infoCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoIcon: {
    width: 32,
    height: 32,
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '700',
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