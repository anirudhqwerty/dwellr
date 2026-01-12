import { AppState } from 'react-native';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// 1. Get these from your Supabase Dashboard -> Project Settings -> API
const supabaseUrl = 'YOUR_SUPABASE_URL'; 
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

// 2. Create the client with a Custom Storage Adapter
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, // <--- CRITICAL: Saves session to phone storage
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // React Native handles URLs differently
  },
});

// 3. (Optional but Recommended) Handle App State Changes
// Refreshes the session when user brings app to foreground
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});