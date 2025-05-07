import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from './supabaseClient';
import { ConnectionContext } from '../App';

// Create an AuthContext with an empty object as default value
export const AuthContext = createContext({});

// Create a hook to use the AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};

// Auth storage keys
const USER_PROFILE_KEY = 'quickquote_user_profile';
const BUSINESS_KEY = 'quickquote_business';
const TEAM_MEMBERS_KEY = 'quickquote_team_members';

// Create a provider component for the AuthContext
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Access the connection context
  const connectionContext = useContext(ConnectionContext);

  // Helper function to handle connection errors
  const handleConnectionError = (error) => {
    // Network request failed errors indicate connection issues
    if (error.message && (
      error.message.includes('Network request failed') || 
      error.message === 'Request Failed')
    ) {
      // Show the connection test component if we have connection issues
      if (connectionContext?.setShowConnectionTest) {
        connectionContext.setShowConnectionTest(true);
      }
    }
  };

  useEffect(() => {
    // Check for current session and set up auth listener
    checkUser();
  }, []);

  // Check current session in Supabase
  const checkUser = async () => {
    try {
      // Get initial session from Supabase - using proper API call for v1.35.7
      const session = supabase.auth.session();
      setSession(session);
      setUser(session?.user ?? null);

      // Set up auth state change listener
      supabase.auth.onAuthStateChange((event, newSession) => {
        console.log('Supabase auth event:', event);
        setSession(newSession);
        setUser(newSession?.user ?? null);
      });
    } catch (error) {
      console.error('Error checking user:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Sign up function using Supabase
  const signUp = async (email, password, options = {}) => {
    setLoading(true);
    try {
      console.log('Signing up with email:', email, 'and metadata:', options.data);
      
      // For Supabase v1.35.7, signUp expects { email, password, options } as a single object
      const { user, session, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: options.data || {},
          redirectTo: options.redirectTo
        }
      });

      if (error) throw error;
      
      // Explicitly update state with new user and session
      if (user && session) {
        setUser(user);
        setSession(session);
        console.log('Updated auth state with new user:', user.id);
      }
      
      // Return data in the format expected by the app
      return { 
        data: { user, session }, 
        error: null 
      };
    } catch (error) {
      console.error('Error signing up:', error.message);
      handleConnectionError(error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Sign in function with password
  const signIn = async (email, password) => {
    setLoading(true);
    try {
      // For Supabase v1.35.7, the API is consistent with signUp
      const { user, session, error } = await supabase.auth.signIn({
        email, 
        password
      });
      
      if (error) throw error;
      
      // Explicitly update state with new user and session
      if (user && session) {
      setUser(user);
        setSession(session);
        console.log('Updated auth state with new user after login:', user.id);
      }
      
      return { 
        data: { user, session }, 
        error: null 
      };
    } catch (error) {
      console.error('Error signing in:', error.message);
      handleConnectionError(error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      console.error('Error signing out:', error.message);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Create or update user profile in Supabase
  const createOrUpdateUser = async (userData) => {
    try {
      console.log('Creating/updating user profile with ID:', user?.id, 'Data:', userData);
      
      if (!user?.id) {
        throw new Error('User ID is not available. Make sure you are logged in.');
      }
      
      // Update user profile in Supabase
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...userData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('Supabase profile update error:', error);
        throw error;
      }

      console.log('Profile updated successfully:', data);

      // Also store in AsyncStorage for offline access
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userData));
      return data;
    } catch (error) {
      console.error('Error updating user profile:', error.message);
      throw error;
    }
  };

  // Create business in Supabase
  const createBusiness = async (businessData) => {
    try {
      console.log('Attempting to create business for user:', user?.id);
      console.log('With data:', businessData);
      
      const { data, error } = await supabase
        .from('businesses')
        .insert([{
          owner_id: user.id,
        ...businessData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('Supabase business creation error:', error);
        throw error;
      }

      console.log('Business created successfully:', data);
      
      // Also store in AsyncStorage for offline access
      await AsyncStorage.setItem(BUSINESS_KEY, JSON.stringify(data[0]));
      return data[0];
    } catch (error) {
      console.error('Error creating business:', error);
      
      // Specifically check for RLS policy errors
      if (error.message && error.message.includes('policy')) {
        console.error('This appears to be a Row Level Security policy issue in Supabase.');
        console.error('Please check your RLS policies for the "businesses" table.');
      }
      
      throw error;
    }
  };

  // Add team member in Supabase
  const addTeamMember = async (userData) => {
    try {
      // First create a new user invitation in Supabase auth
      const { data: inviteData, error: inviteError } = await supabase.auth.api.inviteUserByEmail(userData.email);
      
      if (inviteError) throw inviteError;

      // Then add to team_members table
      const { data, error } = await supabase
        .from('team_members')
        .insert([{
          business_id: (await AsyncStorage.getItem(BUSINESS_KEY)).id,
          email: userData.email,
          role: userData.role,
          invited_by: user.id,
          status: 'invited',
        created_at: new Date().toISOString()
        }]);

      if (error) throw error;
      
      // Get existing team members or initialize empty array for local storage
      const existingData = await AsyncStorage.getItem(TEAM_MEMBERS_KEY);
      const teamMembers = existingData ? JSON.parse(existingData) : [];
      
      // Add new member to local storage
      teamMembers.push(data[0]);
      
      // Save updated list to local storage
      await AsyncStorage.setItem(TEAM_MEMBERS_KEY, JSON.stringify(teamMembers));
      return data[0];
    } catch (error) {
      console.error('Error adding team member:', error.message);
      throw error;
    }
  };

  // Get user profile from Supabase
  const getUserProfile = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      // No error for business as it might not exist yet
      
      // Update local storage
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profileData));
      if (businessData) {
        await AsyncStorage.setItem(BUSINESS_KEY, JSON.stringify(businessData));
      }
      
      return {
        ...profileData,
        business: businessData || null
      };
    } catch (error) {
      console.error('Error getting user profile from Supabase:', error.message);
      
      // Fallback to local storage if network error
    try {
      const profileData = await AsyncStorage.getItem(USER_PROFILE_KEY);
      const businessData = await AsyncStorage.getItem(BUSINESS_KEY);
      
      if (!profileData) return null;
      
      const profile = JSON.parse(profileData);
      const business = businessData ? JSON.parse(businessData) : null;
      
      return {
        ...profile,
        business
      };
      } catch (localError) {
        console.error('Error getting user profile from local storage:', localError.message);
        throw localError;
      }
    }
  };

  // Get team members from Supabase
  const getTeamMembers = async () => {
    try {
      // Get business ID
      const businessData = await AsyncStorage.getItem(BUSINESS_KEY);
      if (!businessData) return [];
      
      const businessId = JSON.parse(businessData).id;
      
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('business_id', businessId);

      if (error) throw error;

      // Update local storage
      await AsyncStorage.setItem(TEAM_MEMBERS_KEY, JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('Error getting team members from Supabase:', error.message);
      
      // Fallback to local storage
      try {
        const data = await AsyncStorage.getItem(TEAM_MEMBERS_KEY);
        return data ? JSON.parse(data) : [];
      } catch (localError) {
        console.error('Error getting team members from local storage:', localError.message);
        throw localError;
      }
    }
  };

  // Delete team member from Supabase
  const deleteTeamMember = async (userId) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      // Update local storage
      const data = await AsyncStorage.getItem(TEAM_MEMBERS_KEY);
      if (!data) return true;
      
      const teamMembers = JSON.parse(data);
      const updatedMembers = teamMembers.filter(member => member.id !== userId);
      
      await AsyncStorage.setItem(TEAM_MEMBERS_KEY, JSON.stringify(updatedMembers));
      return true;
    } catch (error) {
      console.error('Error deleting team member from Supabase:', error.message);
      throw error;
    }
  };

  // Provide user, loading state, and auth methods to the context
  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        createOrUpdateUser,
        createBusiness,
        addTeamMember,
        getUserProfile,
        getTeamMembers,
        deleteTeamMember,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 