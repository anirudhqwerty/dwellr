import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
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

  try {
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'ca3eb4ae-f7a7-4f6e-abfe-c6f4641899d2',
    })).data;
    console.log("Device Push Token:", token); // Log this to verify!
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
  console.log("🚀 STARTING NOTIFICATION SEND...");
  
  try {
    // 1. Get nearby seekers from the database
    const { data: nearbyUsers, error } = await supabase
      .rpc('get_nearby_seekers', {
        listing_lat: listingData.latitude,
        listing_lon: listingData.longitude,
      });

    if (error) {
      console.error("❌ DB ERROR (get_nearby_seekers):", error);
      throw error;
    }

    console.log(`🔎 Found ${nearbyUsers?.length || 0} users to notify.`);

    if (!nearbyUsers || nearbyUsers.length === 0) return { success: true, count: 0 };

    // 2. Prepare messages
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

    // 3. Send in batches
    const batchSize = 100;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      console.log(`📤 Sending batch ${i / batchSize + 1} to Expo...`);
      
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      // 4. Log notifications (Safely!)
      // Wrapped in try/catch so a logging error doesn't crash the actual notification process
      try {
        const logEntries = batch.map((msg: any, index: number) => ({
          user_id: nearbyUsers[i + index]?.user_id, 
          listing_id: listingId,
          notification_type: 'new_listing',
        }));

        if(logEntries.length > 0) {
          const { error: logError } = await supabase.from('notification_logs').insert(logEntries);
          if (logError) console.warn("⚠️ Logging failed (non-fatal):", logError.message);
        }
      } catch (logErr) {
        console.warn("⚠️ Logging skipped:", logErr);
      }
    }

    console.log("✅ Notifications sent successfully!");
    return { success: true, count: messages.length };

  } catch (error) {
    console.error('❌ FATAL ERROR sending notifications:', error);
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
  return Notifications.addNotificationReceivedListener(callback);
}

// Handle notification tap
export function setupNotificationResponseListener(callback: (response: any) => void) {
  return Notifications.addNotificationResponseReceivedListener(callback);
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
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: { 
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: seconds,
      repeats: false 
    },
  });
}