import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [radius, setRadius] = useState(15); // in km
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLong, setManualLong] = useState('');
  const [locationMethod, setLocationMethod] = useState<'auto' | 'manual'>('manual');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*, notification_settings(*)')
        .eq('id', user.id)
        .single();

      setProfile(profileData);

      if (profileData?.notification_settings) {
        setNotificationsEnabled(profileData.notification_settings.enabled);
        setRadius(profileData.notification_settings.radius_km || 15);
        
        if (profileData.notification_settings.latitude && profileData.notification_settings.longitude) {
          setLocation({
            latitude: profileData.notification_settings.latitude,
            longitude: profileData.notification_settings.longitude,
          });
          setManualLat(profileData.notification_settings.latitude.toString());
          setManualLong(profileData.notification_settings.longitude.toString());
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestCurrentLocation = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant location permission to use this feature');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const newLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
      
      setLocation(newLocation);
      setManualLat(newLocation.latitude.toFixed(6));
      setManualLong(newLocation.longitude.toFixed(6));
      setLocationMethod('auto');
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Location fetched successfully!');
      
    } catch (error: any) {
      console.error('Error getting location:', error);
      Alert.alert(
        'Location Error',
        'Unable to fetch your current location. Please enter it manually or try again.'
      );
    }
  };

  const handleManualLocationUpdate = () => {
    const lat = parseFloat(manualLat);
    const long = parseFloat(manualLong);

    if (isNaN(lat) || isNaN(long)) {
      Alert.alert('Invalid Coordinates', 'Please enter valid latitude and longitude values');
      return;
    }

    if (lat < -90 || lat > 90 || long < -180 || long > 180) {
      Alert.alert('Invalid Range', 'Latitude must be between -90 and 90, Longitude between -180 and 180');
      return;
    }

    setLocation({ latitude: lat, longitude: long });
    setLocationMethod('manual');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Success', 'Location updated successfully!');
  };

  const saveSettings = async () => {
    if (!location && notificationsEnabled) {
      Alert.alert('Location Required', 'Please set your location to enable notifications');
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // Get or create push token
      let pushToken = null;
      if (notificationsEnabled) {
        const { status } = await Notifications.requestPermissionsAsync();
        
        if (status === 'granted') {
          try {
            const token = await Notifications.getExpoPushTokenAsync({
              projectId: 'ca3eb4ae-f7a7-4f6e-abfe-c6f4641899d2',
            });
            pushToken = token.data;
          } catch (error) {
            console.error('Error getting push token:', error);
          }
        }
      }

      // Upsert notification settings
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          enabled: notificationsEnabled,
          radius_km: radius,
          latitude: location?.latitude,
          longitude: location?.longitude,
          push_token: pushToken,
          role: profile?.role,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Notification settings saved!');
      
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Something went wrong');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  };

  const toggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <View style={styles.iconContainer}>
            <Ionicons name="notifications" size={40} color="#007AFF" />
          </View>
          <Text style={styles.sectionTitle}>Stay Updated</Text>
          <Text style={styles.sectionSubtitle}>
            {profile?.role === 'seeker' 
              ? 'Get notified when new listings appear near you'
              : 'Get notified when seekers are looking near your properties'
            }
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Enable Notifications</Text>
              <Text style={styles.settingDescription}>
                {profile?.role === 'seeker' 
                  ? 'Receive alerts for new listings'
                  : 'Receive alerts for nearby seekers'
                }
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
              thumbColor={notificationsEnabled ? '#007AFF' : '#f4f3f4'}
            />
          </View>
        </View>

        {notificationsEnabled && (
          <>
            <View style={styles.card}>
              <View style={styles.radiusSection}>
                <View style={styles.radiusHeader}>
                  <Text style={styles.settingTitle}>Search Radius</Text>
                  <View style={styles.radiusBadge}>
                    <Text style={styles.radiusValue}>{radius} km</Text>
                  </View>
                </View>
                <Text style={styles.settingDescription}>
                  {profile?.role === 'seeker'
                    ? 'Get notifications for listings within this distance'
                    : 'Get notifications for seekers within this distance'
                  }
                </Text>
                
                <View style={styles.sliderContainer}>
                  <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabel}>5 km</Text>
                    <Text style={styles.sliderLabel}>50 km</Text>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={5}
                    maximumValue={50}
                    step={5}
                    value={radius}
                    onValueChange={(value) => {
                      setRadius(value);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    minimumTrackTintColor="#007AFF"
                    maximumTrackTintColor="#E5E7EB"
                    thumbTintColor="#007AFF"
                  />
                  <View style={styles.radiusIndicators}>
                    {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((km) => (
                      <View
                        key={km}
                        style={[
                          styles.radiusMarker,
                          radius === km && styles.radiusMarkerActive
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.settingTitle}>Your Location</Text>
              <Text style={styles.settingDescription}>
                Set your location to receive relevant notifications
              </Text>
              
              <View style={styles.locationInputs}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Latitude</Text>
                  <TextInput
                    style={styles.locationInput}
                    placeholder="e.g., 30.3398"
                    placeholderTextColor="#9CA3AF"
                    value={manualLat}
                    onChangeText={setManualLat}
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Longitude</Text>
                  <TextInput
                    style={styles.locationInput}
                    placeholder="e.g., 76.3869"
                    placeholderTextColor="#9CA3AF"
                    value={manualLong}
                    onChangeText={setManualLong}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.updateLocationButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleManualLocationUpdate}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#007AFF" />
                <Text style={styles.updateLocationText}>Update Location</Text>
              </Pressable>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.autoLocationButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={requestCurrentLocation}
              >
                <Ionicons name="location" size={20} color="#FFFFFF" />
                <Text style={styles.autoLocationText}>Use Current Location</Text>
              </Pressable>

              {location && (
                <View style={styles.currentLocationDisplay}>
                  <Ionicons name="location" size={16} color="#10B981" />
                  <Text style={styles.currentLocationText}>
                    Location set: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={24} color="#92400E" style={{ marginRight: 12 }} />
              <Text style={styles.infoText}>
                {profile?.role === 'seeker'
                  ? 'You\'ll receive push notifications when new properties are listed within your selected radius from your set location.'
                  : 'You\'ll receive push notifications when seekers are looking for properties within your selected radius from your listings.'
                }
              </Text>
            </View>
          </>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.saveButtonPressed,
            saving && styles.saveButtonDisabled,
          ]}
          onPress={saveSettings}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Text>
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
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
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
  section: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  radiusSection: {
    gap: 8,
  },
  radiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  radiusBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  radiusValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  sliderContainer: {
    marginTop: 16,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  radiusIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
    paddingHorizontal: 2,
  },
  radiusMarker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  radiusMarkerActive: {
    backgroundColor: '#007AFF',
    transform: [{ scale: 1.3 }],
  },
  locationInputs: {
    marginTop: 16,
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  locationInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  updateLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 16,
  },
  updateLocationText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#007AFF',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    marginHorizontal: 12,
  },
  autoLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 12,
  },
  autoLocationText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  currentLocationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  currentLocationText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});