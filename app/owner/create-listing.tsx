import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY'; // Add your API key here

export default function CreateListing() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rent, setRent] = useState('');
  const [address, setAddress] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  
  const [location, setLocation] = useState({
    latitude: 30.3398, // Default to Patiala
    longitude: 76.3869,
  });
  
  const mapRef = useRef<MapView>(null);
  const searchTimeout = useRef<any>(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    }
  };

  const searchPlaces = async (query: string) => {
    setAddress(query);
    
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
            query
          )}&key=${GOOGLE_MAPS_API_KEY}&components=country:in`
        );
        
        const data = await response.json();
        
        if (data.predictions) {
          setSearchResults(data.predictions);
        }
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
        
        setLocation({
          latitude: lat,
          longitude: lng,
        });
        
        setAddress(description);
        setSearchResults([]);
        setShowMap(true);
        
        // Animate map to new location
        mapRef.current?.animateToRegion({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Place details error:', error);
      Alert.alert('Error', 'Could not get location details');
    }
  };

  const handleSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!title || !description || !rent || !address) {
      Alert.alert('Missing info', 'Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const { error } = await supabase.from('listings').insert({
        owner_id: user.id,
        title,
        description,
        rent: parseFloat(rent),
        address,
        latitude: location.latitude,
        longitude: location.longitude,
        status: 'active',
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Listing created successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);

    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Something went wrong');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Create Listing</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Property Title</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              placeholder="e.g., 2BHK Apartment in Green Park"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              value={title}
              onChangeText={setTitle}
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Description</Text>
          <View style={[styles.inputWrapper, styles.textArea]}>
            <TextInput
              placeholder="Describe your property..."
              placeholderTextColor="#9CA3AF"
              style={[styles.input, styles.textAreaInput]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Monthly Rent (₹)</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              placeholder="e.g., 15000"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              value={rent}
              onChangeText={setRent}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Address</Text>
          <View style={styles.inputWrapper}>
            <Image
              source={{ uri: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f4cd.svg' }}
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Search for your address..."
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              value={address}
              onChangeText={searchPlaces}
            />
            {searching && (
              <ActivityIndicator size="small" color="#007AFF" />
            )}
          </View>
          
          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.map((result) => (
                <Pressable
                  key={result.place_id}
                  style={styles.searchResultItem}
                  onPress={() => selectPlace(result.place_id, result.description)}
                >
                  <Image
                    source={{ uri: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f4cd.svg' }}
                    style={styles.resultIcon}
                  />
                  <Text style={styles.searchResultText}>{result.description}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {showMap && (
          <View style={styles.mapContainer}>
            <Text style={styles.label}>Location on Map</Text>
            <View style={styles.mapWrapper}>
              <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker
                  coordinate={location}
                  title={title || 'Your Property'}
                  description={address}
                />
              </MapView>
            </View>
            <Text style={styles.mapHint}>
              📍 Drag the map to adjust the marker position
            </Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            pressed && styles.submitButtonPressed,
          ]}
          onPress={handleSubmit}
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
              <Text style={styles.submitText}>Create Listing</Text>
            )}
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    minHeight: 56,
  },
  textArea: {
    minHeight: 120,
    alignItems: 'flex-start',
    paddingVertical: 16,
  },
  inputIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  textAreaInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  searchResults: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resultIcon: {
    width: 16,
    height: 16,
    marginRight: 12,
  },
  searchResultText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  mapContainer: {
    marginBottom: 24,
  },
  mapWrapper: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  map: {
    flex: 1,
  },
  mapHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  submitButton: {
    height: 56,
    borderRadius: 12,
    marginTop: 16,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 17,
  },
});