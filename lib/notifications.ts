import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// 1. Setup Handler (Foreground notifications)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // Modern equivalent of 'shouldShowAlert' for banners
    shouldShowAlert: true,  // Fallback
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 2. Setup Channel (Android)
export async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007AFF',
    });
  }
}

// 3. Get Fresh Token (ALWAYS use this when saving settings)
export async function getFreshPushToken() {
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  try {
    // Always fetch a fresh token
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId: 'ca3eb4ae-f7a7-4f6e-abfe-c6f4641899d2',
    });
    
    console.log(' FRESH PUSH TOKEN:', tokenResponse.data);
    return tokenResponse.data;
  } catch (error) {
    console.error("Error fetching push token:", error);
    return null;
  }
}

// Keep existing helper for other files if needed, but prefer getFreshPushToken for settings
export async function registerForPushNotifications() {
  await setupNotificationChannel();
  return await getFreshPushToken();
}

// ... rest of your existing functions (sendNotificationToNearbyUsers, etc.) keep them as is ...
// Send notification to nearby users
export async function sendNotificationToNearbyUsers(
  listingId: string,
  listingData: {
    title: string;
    latitude: number;
    longitude: number;
    rent: number;
  }
) {
  // ... existing implementation ...
  console.log(" STARTING NOTIFICATION SEND...");
  
  try {
    const { data: nearbyUsers, error } = await supabase
      .rpc('get_nearby_seekers', {
        listing_lat: listingData.latitude,
        listing_lon: listingData.longitude,
      });

    if (error) throw error;
    if (!nearbyUsers || nearbyUsers.length === 0) return { success: true, count: 0 };

   const messages = nearbyUsers.map((user: any) => ({
    to: user.push_token,
    sound: 'default',
    title: ' New home near you!',
    body: `₹${listingData.rent}/month • ${listingData.title} is just ${user.distance.toFixed(
      1
    )} km from your location`,
    data: {
      type: 'new_listing',
      listingId,
      distance: user.distance,
    },
  }));


    // Batch sending
    const batchSize = 100;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });
    }

    return { success: true, count: messages.length };
  } catch (error) {
    console.error('Error sending notifications:', error);
    return { success: false, error };
  }
}

export async function notifyOwnersAboutSeeker(seekerData: any) {

  try {
    const { data: nearbyOwners, error } = await supabase
      .rpc('get_nearby_owners', {
        seeker_lat: seekerData.latitude,
        seeker_lon: seekerData.longitude,
        search_radius: seekerData.radius,
      });

    if (error) throw error;
    if (!nearbyOwners) return { success: true, count: 0 };

    const messages = nearbyOwners.map((owner: any) => ({
      to: owner.push_token,
      sound: 'default',
      title: ' Seeker Looking Nearby!',
      body: `Someone is looking for a property ${owner.distance.toFixed(1)} km from your listing`,
      data: { type: 'nearby_seeker', distance: owner.distance },
    }));

    if (messages.length > 0) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
    }
    return { success: true, count: messages.length };
  } catch (error) {
    console.error('Error notifying owners:', error);
    return { success: false, error };
  }
}

export function setupNotificationListener(callback: (notification: any) => void) {
  return Notifications.addNotificationReceivedListener(callback);
}

export function setupNotificationResponseListener(callback: (response: any) => void) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}