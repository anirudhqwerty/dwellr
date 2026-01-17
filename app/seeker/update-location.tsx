import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function UpdateLocation() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  
  const [location, setLocation] = useState({
    latitude: 30.3398,
    longitude: 76.3869,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });

  const mapRef = useRef<MapView>(null);
  const searchTimeout = useRef<any>(null);

  useEffect(() => {
    loadCurrentLocation();
  }, []);

  const loadCurrentLocation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from('notification_settings')
        .select('latitude, longitude')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settings?.latitude && settings?.longitude) {
        const newLocation = {
          latitude: settings.latitude,
          longitude: settings.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        setLocation(newLocation);
        if (mapRef.current) {
            mapRef.current.animateToRegion(newLocation, 1000);
        }
        reverseGeocode(settings.latitude, settings.longitude);
      }
    } catch (error) {
      console.log('Error loading location:', error);
    }
  };

  const searchPlaces = async (query: string) => {
    setAddress(query);
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
            query
          )}&key=${GOOGLE_MAPS_API_KEY}&components=country:in`
        );
        const data = await response.json();
        if (data.predictions) setSearchResults(data.predictions);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const selectPlace = async (placeId: string, description: string) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.result?.geometry?.location) {
        const { lat, lng } = data.result.geometry.location;
        const newLocation = {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        setLocation(newLocation);
        setAddress(description);
        setSearchResults([]);
        mapRef.current?.animateToRegion(newLocation, 1000);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not get location details');
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        setAddress(data.results[0].formatted_address);
      }
    } catch (error) {
      console.log('Reverse geocoding failed', error);
    }
  };

  const onRegionChangeComplete = (region: Region) => {
    if (!isMapReady) return;
    setLocation({
      latitude: region.latitude,
      longitude: region.longitude,
      latitudeDelta: region.latitudeDelta,
      longitudeDelta: region.longitudeDelta,
    });
  };

  const handleUpdateLocation = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ address: address })
        .eq('id', user.id);

      if (profileError) throw profileError;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const { data: existingSettings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const { error: settingsError } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          radius_km: existingSettings?.radius_km || 15,
          enabled: existingSettings?.enabled ?? true,
          latitude: location.latitude,
          longitude: location.longitude,
          location: `POINT(${location.longitude} ${location.latitude})`,
          role: profile?.role || 'seeker',
          push_token: existingSettings?.push_token,
        }, { onConflict: 'user_id' });

      if (settingsError) throw settingsError;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Location updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);

    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message ?? 'Failed to update location');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Set Location</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={location}
          onMapReady={() => setIsMapReady(true)}
          onRegionChangeComplete={onRegionChangeComplete}
        />
        <View style={styles.markerFixed}>
          <View style={styles.markerPulse} />
          <Ionicons name="location-sharp" size={40} color="#EA4335" />
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.panel}>
          <Text style={styles.label}>Selected Location</Text>
          
          <View style={styles.inputWrapper}>
            <Ionicons name="search" size={20} color="#6B7280" style={{ marginRight: 10 }} />
            <TextInput
              placeholder="Search area, city..."
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              value={address}
              onChangeText={searchPlaces}
            />
            {searching && <ActivityIndicator size="small" color="#007AFF" />}
          </View>

          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.slice(0, 3).map((result) => (
                <Pressable
                  key={result.place_id}
                  style={styles.searchResultItem}
                  onPress={() => selectPlace(result.place_id, result.description)}
                >
                  <Ionicons name="location-outline" size={16} color="#6B7280" style={{ marginRight: 10 }} />
                  <Text style={styles.searchResultText} numberOfLines={1}>{result.description}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.submitButtonPressed,
            ]}
            onPress={handleUpdateLocation}
            disabled={loading}
          >
            <LinearGradient
              colors={['#007AFF', '#0051D5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Confirm Location</Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20,
    backgroundColor: '#FFFFFF', zIndex: 10,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 5,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  
  mapContainer: { flex: 1, position: 'relative' },
  map: { width: '100%', height: '100%' },
  markerFixed: {
    position: 'absolute', top: '50%', left: '50%',
    marginLeft: -20, marginTop: -40,
    alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'none',
  },
  markerPulse: {
    position: 'absolute', bottom: 2, width: 12, height: 4,
    backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 6,
    transform: [{ scaleX: 2 }],
  },

  overlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 10,
  },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 12, color: '#374151' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, backgroundColor: '#F9FAFB', paddingHorizontal: 16, height: 50,
  },
  input: { flex: 1, fontSize: 16, color: '#111827' },
  
  searchResults: {
    marginTop: 8, backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB', maxHeight: 150,
  },
  searchResultItem: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  searchResultText: { flex: 1, fontSize: 14, color: '#374151' },

  submitButton: {
    height: 56, borderRadius: 12, marginTop: 24, overflow: 'hidden',
  },
  submitGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  submitButtonPressed: { opacity: 0.9 },
  submitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 17 },
});
