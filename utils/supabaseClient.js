import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://yuellorvkmdgoxkbljhd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1ZWxsb3J2a21kZ294a2JsamhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1OTc3NDEsImV4cCI6MjA2MjE3Mzc0MX0.Dz3jv_MEZajLcyDU3rqvd4NhzfnKfYYihr-B2IIvTjY';

// Debug info
console.log('Initializing Supabase client with URL:', supabaseUrl);
console.log('Using anon key:', supabaseAnonKey.substring(0, 10) + '...');

// Initialize Supabase client with minimal configuration
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  // Disable realtime
  realtime: {
    params: {
      eventsPerSecond: 0,
    },
  }
  // Removed custom fetch implementation to rule that out as the issue
});

// Expose URL and key for testing purposes
supabase.supabaseUrl = supabaseUrl;
supabase.supabaseKey = supabaseAnonKey;

// Test the connection immediately
(async () => {
  try {
    console.log('Testing direct fetch to Supabase...');
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey
      }
    });
    console.log('Direct fetch response status:', response.status);
    if (response.ok) {
      console.log('Direct fetch successful!');
    } else {
      console.log('Direct fetch failed with status:', response.status);
      const text = await response.text();
      console.log('Response body:', text);
    }
  } catch (error) {
    console.error('Direct fetch error:', error);
  }
})();

export default supabase; 