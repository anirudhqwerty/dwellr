import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import ListingDetailModal from '../../components/ListingDetailModal';

export default function SavedScreen() {
  const [savedListings, setSavedListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSavedListings();
    }, [])
  );

  const loadSavedListings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: saved } = await supabase
        .from('saved_listings')
        .select(`
          listing_id,
          created_at,
          listing:listings (
            *,
            owner:profiles!listings_owner_id_fkey(name, phone)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (saved) {
        const formattedListings = saved
          .filter(item => item.listing)
          .map((item: any) => ({
            ...item.listing,
            owner_name: item.listing.owner?.name,
            owner_phone: item.listing.owner?.phone,
            saved_at: item.created_at,
          }));
        setSavedListings(formattedListings);
      }
    } catch (error) {
      console.error('Error loading saved listings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSavedListings();
  };

  const openListingDetail = (listing: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedListing(listing);
    setModalVisible(true);
  };

  const renderListingCard = ({ item }: { item: any }) => (
    <Pressable
      style={({ pressed }) => [
        styles.listingCard,
        pressed && styles.listingCardPressed,
      ]}
      onPress={() => openListingDetail(item)}
    >
      <View style={styles.listingHeader}>
        <Text style={styles.listingTitle}>{item.title}</Text>
        <Ionicons name="heart" size={24} color="#DC2626" />
      </View>
      <View style={styles.listingRow}>
        <Ionicons name="location-outline" size={16} color="#6B7280" />
        <Text style={styles.listingAddress} numberOfLines={1}>
          {item.address}
        </Text>
      </View>
      <Text style={styles.listingPrice}>₹{item.rent?.toLocaleString()}/month</Text>
      <Text style={styles.savedDate}>
        Saved {new Date(item.saved_at).toLocaleDateString()}
      </Text>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

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
          <Text style={styles.title}>Saved Homes</Text>
          <Text style={styles.subtitle}>Your favorite listings</Text>
        </View>

        {savedListings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="heart-dislike-outline" size={80} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No saved homes yet</Text>
            <Text style={styles.emptySubtitle}>
              When you find a home you like, tap the heart icon to save it here
            </Text>
          </View>
        ) : (
          <View style={styles.listingsContainer}>
            {savedListings.map((item) => (
              <View key={item.id} style={{ marginBottom: 12 }}>
                {renderListingCard({ item })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <ListingDetailModal
        visible={modalVisible}
        listing={selectedListing}
        onClose={() => {
          setModalVisible(false);
          loadSavedListings(); // Refresh in case unsaved
        }}
        isOwner={false}
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
    flexGrow: 1,
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
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  listingsContainer: {
    padding: 20,
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
  listingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  listingAddress: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  listingPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  savedDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});