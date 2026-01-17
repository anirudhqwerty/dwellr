import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import ListingDetailModal from '../../components/ListingDetailModal';

const { width } = Dimensions.get('window');

// --- FIXED: ScalePressable ---
const ScalePressable = ({ children, style, onPress, activeScale = 0.97 }: any) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const animateIn = () => {
    Animated.spring(scaleValue, {
      toValue: activeScale,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const animateOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={animateIn}
      onPressOut={animateOut}
      style={{ width: style?.width ? style.width : undefined }} 
    >
      <Animated.View
        style={[
          style, 
          { transform: [{ scale: scaleValue }] },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
};

// --- Micro-Component: Skeleton Loader ---
const SkeletonCard = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View style={[styles.skeletonCard, { opacity }]} />
  );
};

export default function SeekerHome() {
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
        .select(`*, owner:profiles!listings_owner_id_fkey(name, phone)`)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (listingsData) {
        const formattedListings = listingsData.map((listing: any) => ({
          ...listing,
          owner_name: listing.owner?.name,
          owner_phone: listing.owner?.phone,
        }));
        setListings(formattedListings);
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const handleUpdateLocation = () => {
    Haptics.selectionAsync();
    router.push('/seeker/update-location');
  };
  const navigateToNotificationSettings = () => {
    Haptics.selectionAsync();
    router.push('/(tabs)/notifications');
  };
  const navigateToMapView = () => {
    Haptics.selectionAsync();
    router.push('/seeker/map-view');
  };
  const navigateToAllListings = () => {
    Haptics.selectionAsync();
    router.push('/seeker/all-listings');
  };
  const navigateToMessages = () => {
    Haptics.selectionAsync();
    router.push('/messages');
  };

  const openListingDetail = (listing: any) => {
    Haptics.selectionAsync();
    setSelectedListing(listing);
    setModalVisible(true);
  };

  const renderListingCard = (item: any) => (
    <ScalePressable
      key={item.id}
      style={styles.listingCard}
      onPress={() => openListingDetail(item)}
    >
      <View style={styles.cardImageContainer}>
        <Image
          source={{ 
            uri: item.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80' 
          }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>ACTIVE</Text>
        </View>
        <View style={styles.priceTag}>
          <Text style={styles.priceText}>₹{item.rent?.toLocaleString()}</Text>
          <Text style={styles.periodText}>/mo</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>
          <Ionicons name="chevron-forward-circle" size={24} color="#E5E7EB" />
        </View>
        
        <View style={styles.listingRow}>
          <Ionicons name="location-outline" size={16} color="#6B7280" />
          <Text style={styles.listingAddress} numberOfLines={1}>
            {item.address}
          </Text>
        </View>
      </View>
    </ScalePressable>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.name}>{profile?.name?.split(' ')[0] || 'Seeker'}</Text>
            </View>
            <ScalePressable
              style={styles.avatarContainer}
              onPress={() => Haptics.selectionAsync()}
            >
              <Ionicons name="person" size={24} color="#007AFF" />
            </ScalePressable>
          </View>

          <ScalePressable 
            style={styles.searchBar} 
            onPress={navigateToAllListings}
            activeScale={1} 
          >
            <Ionicons name="search" size={20} color="#111827" />
            <View style={styles.searchTextContainer}>
              <Text style={styles.searchTitle}>Find Home</Text>
              <Text style={styles.searchSubtitle} numberOfLines={2}>
                {profile?.address 
                  ? `${profile.address.split(',').slice(0, 2).join(', ')}` 
                  : 'Tap filter to set your location'}
              </Text>
            </View>
            <Pressable
              onPress={handleUpdateLocation}
              hitSlop={10}
              style={styles.searchFilterIcon}
            >
              <Ionicons name="options-outline" size={18} color="#111827" />
            </Pressable>
          </ScalePressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Explore</Text>
          <View style={styles.actionsGrid}>
            {[
              { icon: 'map', title: 'Map View', sub: 'Browse area', fn: navigateToMapView, color: '#3B82F6' },
              { icon: 'chatbubble-ellipses', title: 'Messages', sub: 'Chats', fn: navigateToMessages, color: '#10B981' },
              { icon: 'notifications', title: 'Alerts', sub: 'Updates', fn: navigateToNotificationSettings, color: '#F59E0B' },
              { icon: 'navigate', title: 'Location', sub: 'Change area', fn: handleUpdateLocation, color: '#8B5CF6' },
            ].map((action, index) => (
              <ScalePressable key={index} style={styles.actionCard} onPress={action.fn}>
                <View style={[styles.actionIconContainer, { backgroundColor: `${action.color}15` }]}>
                  <Ionicons name={action.icon as any} size={22} color={action.color} />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.sub}</Text>
              </ScalePressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Listings</Text>
            {listings.length > 0 && (
              <Pressable onPress={navigateToAllListings} hitSlop={10}>
                <Text style={styles.sectionLink}>See all</Text>
              </Pressable>
            )}
          </View>
          
          {loading && !refreshing ? (
            <View>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : listings.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="home" size={32} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>No homes found</Text>
              <Text style={styles.emptySubtitle}>
                We couldn't find any active listings in your area just yet.
              </Text>
              <ScalePressable style={styles.ctaButton} onPress={handleUpdateLocation}>
                <Text style={styles.ctaText}>Explore nearby areas</Text>
              </ScalePressable>
            </View>
          ) : (
            <View style={{ gap: 24 }}> 
              {listings.map((item) => renderListingCard(item))}
            </View>
          )}
        </View>

        <ScalePressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </ScalePressable>
      </ScrollView>

      <ListingDetailModal
        visible={modalVisible}
        listing={selectedListing}
        onClose={() => setModalVisible(false)}
        isOwner={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  
  // Header
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  searchTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  searchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  searchSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  searchFilterIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Sections
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
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },

  // Actions
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },

  // Listings - BOLDER BORDERS APPLIED HERE
  listingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  cardImageContainer: {
    height: 200,
    width: '100%',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  priceTag: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  periodText: {
    fontSize: 11,
    color: '#E5E7EB',
    marginLeft: 2,
  },
  cardContent: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  listingTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  listingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listingAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
    flex: 1,
  },

  // Skeleton
  skeletonCard: {
    height: 280,
    width: '100%',
    backgroundColor: '#E5E7EB',
    borderRadius: 20,
    marginBottom: 20,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E5E7EB',
  },
  emptyIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  
  // Sign Out
  signOutButton: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 16,
    alignItems: 'center',
  },
  signOutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
});