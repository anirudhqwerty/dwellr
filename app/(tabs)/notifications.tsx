import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { supabase } from '../../lib/supabase';

export default function NotificationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [radius, setRadius] = useState(15); // in km
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadSettings();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    // Request notification permission
    const { status: notifStatus } = await Notifications.requestPermissionsAsync();
    
    // Request location permission
    const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
    
    if (locStatus === 'granted') {
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    }
  };

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
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!location && notificationsEnabled) {
      Alert.alert('Location Required', 'Please enable location services to use notifications');
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
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: 'ca3eb4ae-f7a7-4f6e-abfe-c6f4641899d2', // Your EAS project ID
        });
        pushToken = token.data;
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
    
    if (value && !location) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
      }
    }
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
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <View style={styles.iconContainer}>
            <Image
              source={{ uri: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f514.svg' }}
              style={styles.headerIcon}
            />
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
              <View style={styles.locationInfo}>
                <Image
                  source={{ uri: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f4cd.svg' }}
                  style={styles.locationIcon}
                />
                <View style={styles.locationText}>
                  <Text style={styles.settingTitle}>Your Location</Text>
                  <Text style={styles.settingDescription}>
                    {location
                      ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                      : 'Location not available'
                    }
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Image
                source={{ uri: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/2139.svg' }}
                style={styles.infoIcon}
              />
              <Text style={styles.infoText}>
                {profile?.role === 'seeker'
                  ? 'You\'ll receive push notifications when new properties are listed within your selected radius from your current location.'
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
  headerIcon: {
    width: 40,
    height: 40,
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
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    width: 32,
    height: 32,
    marginRight: 16,
  },
  locationText: {
    flex: 1,
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
  infoIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    marginTop: 2,
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