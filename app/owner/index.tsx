import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ListingDetailModal from '../../components/ListingDetailModal';

export default function OwnerHome() {
  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData);

      const { data: listingsData } = await supabase
        .from('listings')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (listingsData) {
        setListings(listingsData);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const navigateToCreateListing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/owner/create-listing');
  };

  const navigateToMyListings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/owner/listings');
  };

  const navigateToAnalytics = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/owner/analytics');
  };

  const navigateToMessages = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/owner/messages');
  };

  const navigateToNotificationSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/notifications');
  };

  const openListingDetail = (listing: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedListing(listing);
    setModalVisible(true);
  };

  const handleEditListing = () => {
    // TODO: Navigate to edit screen
    Alert.alert('Edit Listing', 'Edit functionality coming soon!');
  };

  const handleDeleteListing = async () => {
    if (!selectedListing) return;

    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', selectedListing.id);

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Listing deleted successfully');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete listing');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const renderListingItem = ({ item }: { item: any }) => (
    <Pressable
      style={({ pressed }) => [
        styles.listingCard,
        pressed && styles.listingCardPressed,
      ]}
      onPress={() => openListingDetail(item)}
    >
      <View style={styles.listingHeader}>
        <Text style={styles.listingTitle}>{item.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? '#DCFCE7' : '#F3F4F6' }]}>
          <Text style={[styles.statusText, { color: item.status === 'active' ? '#166534' : '#374151' }]}>
            {item.status?.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.listingAddress} numberOfLines={1}>
        <Ionicons name="location-outline" size={14} color="#6B7280" /> {item.address}
      </Text>
      <Text style={styles.listingPrice}>₹{item.rent}/month</Text>
      <View style={styles.tapHint}>
        <Text style={styles.tapHintText}>Tap to view details</Text>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </View>
    </Pressable>
  );

  return (
    <>
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
              <Ionicons name="person" size={24} color="#007AFF" />
            </Pressable>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{listings.length}</Text>
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
              <Ionicons name="add-circle-outline" size={28} color="#FFFFFF" />
              <Text style={styles.createText}>Create New Listing</Text>
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <Pressable
              style={styles.actionCard}
              onPress={navigateToMyListings}
            >
              <View style={styles.actionIconContainer}>
                <Ionicons name="list" size={24} color="#007AFF" />
              </View>
              <Text style={styles.actionTitle}>My Listings</Text>
              <Text style={styles.actionSubtitle}>View all</Text>
            </Pressable>

            <Pressable
              style={styles.actionCard}
              onPress={navigateToAnalytics}
            >
              <View style={styles.actionIconContainer}>
                <Ionicons name="bar-chart" size={24} color="#007AFF" />
              </View>
              <Text style={styles.actionTitle}>Analytics</Text>
              <Text style={styles.actionSubtitle}>View stats</Text>
            </Pressable>

            <Pressable
              style={styles.actionCard}
              onPress={navigateToMessages}
            >
              <View style={styles.actionIconContainer}>
                <Ionicons name="chatbubble-ellipses" size={24} color="#007AFF" />
              </View>
              <Text style={styles.actionTitle}>Messages</Text>
              <Text style={styles.actionSubtitle}>0 new</Text>
            </Pressable>

            <Pressable
              style={styles.actionCard}
              onPress={navigateToNotificationSettings}
            >
              <View style={styles.actionIconContainer}>
                <Ionicons name="notifications" size={24} color="#007AFF" />
              </View>
              <Text style={styles.actionTitle}>Notifications</Text>
              <Text style={styles.actionSubtitle}>Settings</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Listings</Text>
            {listings.length > 0 && (
              <Pressable onPress={navigateToMyListings}>
                <Text style={styles.sectionLink}>See all</Text>
              </Pressable>
            )}
          </View>
          
          {listings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="home-outline" size={64} color="#D1D5DB" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>No listings yet</Text>
              <Text style={styles.emptySubtitle}>
                Create your first listing to start connecting with seekers
              </Text>
            </View>
          ) : (
            <View>
              {listings.slice(0, 3).map(item => (
                <View key={item.id} style={{ marginBottom: 16 }}>
                  {renderListingItem({ item })}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="call" size={24} color="#007AFF" style={{ marginRight: 16 }} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Contact Number</Text>
            <Text style={styles.infoText}>{profile?.phone || 'Not set'}</Text>
          </View>
        </View>

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>

      <ListingDetailModal
        visible={modalVisible}
        listing={selectedListing}
        onClose={() => setModalVisible(false)}
        isOwner={true}
        onEdit={handleEditListing}
        onDelete={handleDeleteListing}
      />
    </>
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
  listingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  listingCardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  listingAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  listingPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 8,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  tapHintText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});