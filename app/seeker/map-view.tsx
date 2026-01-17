import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Region } from 'react-native-maps';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import ListingDetailModal from '../../components/ListingDetailModal';

export default function MapViewScreen() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [region, setRegion] = useState<Region>({
    latitude: 30.3398,
    longitude: 76.3869,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    loadListingsAndLocation();
  }, []);

  const loadListingsAndLocation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load user's location from notification settings
      const { data: settings } = await supabase
        .from('notification_settings')
        .select('latitude, longitude')
        .eq('user_id', user.id)
        .single();

      if (settings?.latitude && settings?.longitude) {
        const newRegion = {
          latitude: settings.latitude,
          longitude: settings.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);
      }

      // Load all active listings with owner info
      const { data: listingsData } = await supabase
        .from('listings')
        .select(`
          *,
          owner:profiles!listings_owner_id_fkey(name, phone)
        `)
        .eq('status', 'active')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (listingsData) {
        const formattedListings = listingsData.map((listing: any) => ({
          ...listing,
          owner_name: listing.owner?.name,
          owner_phone: listing.owner?.phone,
        }));
        setListings(formattedListings);
      }
    } catch (error) {
      console.error('Error loading map data:', error);
      Alert.alert('Error', 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkerPress = (listing: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedListing(listing);
    setModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Browse Properties</Text>
          <View style={{ width: 40 }} />
        </View>

        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={region}
          showsUserLocation={false}
          showsMyLocationButton={false}
        >
          {listings.map((listing) => (
            <Marker
              key={listing.id}
              coordinate={{
                latitude: parseFloat(listing.latitude),
                longitude: parseFloat(listing.longitude),
              }}
              onPress={() => handleMarkerPress(listing)}
            >
              <View style={styles.markerContainer}>
                <View style={styles.marker}>
                  <Ionicons name="home" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.markerArrow} />
              </View>
            </Marker>
          ))}
        </MapView>

        <View style={styles.statsCard}>
          <Ionicons name="home" size={20} color="#007AFF" />
          <Text style={styles.statsText}>
            {listings.length} properties available
          </Text>
        </View>
      </View>

      <ListingDetailModal
        visible={modalVisible}
        listing={selectedListing}
        onClose={() => setModalVisible(false)}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#007AFF',
    marginTop: -3,
  },
  statsCard: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
});