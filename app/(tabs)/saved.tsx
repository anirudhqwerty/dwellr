import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
  Animated,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useFocusEffect, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import ListingDetailModal from '../../components/ListingDetailModal';

// --- Helper: Relative Time ---
const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'Saved today';
  if (diffInDays === 1) return 'Saved yesterday';
  return `Saved ${diffInDays} days ago`;
};

// --- Micro-Component: Scale Animation ---
const ScalePressable = ({ children, style, onPress }: any) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[style, { transform: [{ scale: scaleValue }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

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
    Haptics.selectionAsync();
    setSelectedListing(listing);
    setModalVisible(true);
  };

  const navigateToExplore = () => {
    Haptics.selectionAsync();
    router.push('/seeker/all-listings');
  };

  const renderListingCard = ({ item }: { item: any }) => (
    <ScalePressable style={styles.listingCard} onPress={() => openListingDetail(item)}>
      <View style={styles.cardContentRow}>
        {/* Left Thumbnail - Fixed Dimensions & Corners */}
        <Image 
          source={{ uri: item.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80' }} 
          style={styles.thumbnail}
          resizeMode="cover" 
        />
        
        {/* Right Details */}
        <View style={styles.cardDetails}>
          <View style={styles.cardHeader}>
            <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>
            <Ionicons name="heart" size={20} color="#DC2626" />
          </View>

          <View style={styles.listingRow}>
            <Ionicons name="location-outline" size={14} color="#6B7280" />
            <Text style={styles.listingAddress} numberOfLines={1}>
              {item.address}
            </Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.listingPrice}>₹{item.rent?.toLocaleString()}</Text>
            <Text style={styles.perMonth}>/mo</Text>
          </View>

          <Text style={styles.savedDateText}>
            {getRelativeTime(item.saved_at)}
          </Text>
        </View>
      </View>
    </ScalePressable>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111827" />
        }
      >
        {/* Clean Text-Only Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Saved Homes</Text>
          <Text style={styles.subtitle}>Your favorite places</Text>
        </View>

        {savedListings.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="heart" size={32} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>No saved homes yet</Text>
            <Text style={styles.emptySubtitle}>
              When you find a place you love, tap the heart to keep it safe here.
            </Text>
            
            <ScalePressable style={styles.ctaButton} onPress={navigateToExplore}>
              <Text style={styles.ctaText}>Explore homes</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </ScalePressable>
          </View>
        ) : (
          <View style={styles.listingsContainer}>
            {savedListings.map((item) => (
              <View key={item.id}>
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
          loadSavedListings(); 
        }}
        isOwner={false}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  
  // Clean Header
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 70, // More top space for modern feel
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Listings List
  listingsContainer: {
    padding: 20,
    gap: 16,
  },

  // Listing Card
  listingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'center', // Vertically center the image with content
    gap: 16,
  },
  thumbnail: {
    width: 100,  // Increased size
    height: 100, // Perfect square
    borderRadius: 12, // Smooth corners (not too sharp, not too round)
    backgroundColor: '#F3F4F6',
  },
  cardDetails: {
    flex: 1,
    justifyContent: 'center',
    height: 100, // Match image height to vertically distribute text evenly
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
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
    marginBottom: 6,
    gap: 4,
  },
  listingAddress: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 'auto', // Pushes price to bottom of container
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  perMonth: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 2,
  },
  savedDateText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
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
    lineHeight: 22,
    marginBottom: 32,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#111827',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});