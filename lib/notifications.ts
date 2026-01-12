import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // Fixed: Replaced deprecated shouldShowAlert
    shouldShowList: true,   // Fixed: Replaced deprecated shouldShowAlert
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Register for push notifications
export async function registerForPushNotifications() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007AFF',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return;
  }

  // Wrapped in try/catch to handle simulator errors gracefully
  try {
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'ca3eb4ae-f7a7-4f6e-abfe-c6f4641899d2',
    })).data;
  } catch (error) {
    console.log("Error fetching push token:", error);
  }

  return token;
}

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
  try {
    // Get nearby seekers from the database
    const { data: nearbyUsers, error } = await supabase
      .rpc('get_nearby_seekers', {
        listing_lat: listingData.latitude,
        listing_lon: listingData.longitude,
      });

    if (error) throw error;
    if (!nearbyUsers || nearbyUsers.length === 0) return { success: true, count: 0 };

    // Send push notifications to all nearby users
    const messages = nearbyUsers.map((user: any) => ({
      to: user.push_token,
      sound: 'default',
      title: '🏠 New Listing Nearby!',
      body: `${listingData.title} - ₹${listingData.rent}/month (${user.distance.toFixed(1)} km away)`,
      data: { 
        type: 'new_listing',
        listingId,
        distance: user.distance,
      },
    }));

    // Send in batches
    const batchSize = 100;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      // Log notifications
      const logEntries = batch.map((msg: any, index: number) => ({
        user_id: nearbyUsers[i + index]?.user_id, // Corrected index mapping for batching
        listing_id: listingId,
        notification_type: 'new_listing',
      }));

      if(logEntries.length > 0) {
        await supabase.from('notification_logs').insert(logEntries);
      }
    }

    return { success: true, count: messages.length };
  } catch (error) {
    console.error('Error sending notifications:', error);
    return { success: false, error };
  }
}

// Notify owners about nearby seeker
export async function notifyOwnersAboutSeeker(
  seekerData: {
    latitude: number;
    longitude: number;
    radius: number;
  }
) {
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
      title: '🔍 Seeker Looking Nearby!',
      body: `Someone is looking for a property ${owner.distance.toFixed(1)} km from your listing`,
      data: { 
        type: 'nearby_seeker',
        distance: owner.distance,
      },
    }));

    if (messages.length > 0) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
    }

    return { success: true, count: messages.length };
  } catch (error) {
    console.error('Error notifying owners:', error);
    return { success: false, error };
  }
}

// Listen for notifications while app is open
export function setupNotificationListener(callback: (notification: any) => void) {
  const subscription = Notifications.addNotificationReceivedListener(callback);
  return subscription;
}

// Handle notification tap
export function setupNotificationResponseListener(callback: (response: any) => void) {
  const subscription = Notifications.addNotificationResponseReceivedListener(callback);
  return subscription;
}

// Schedule a local notification (for testing)
export async function scheduleTestNotification(
  title: string,
  body: string,
  seconds: number = 5
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default', // Fixed: Must be string 'default', not boolean true
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: { 
        seconds: seconds,
        repeats: false // Fixed: Added repeats: false to resolve TypeScript ambiguity
    } as any,
  });
}