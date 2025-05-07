import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create an AuthContext with an empty object as default value
export const AuthContext = createContext({});

// Create a hook to use the AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};

// Auth storage key
const AUTH_STORAGE_KEY = 'quickquote_auth';
const USER_PROFILE_KEY = 'quickquote_user_profile';
const BUSINESS_KEY = 'quickquote_business';
const TEAM_MEMBERS_KEY = 'quickquote_team_members';

// Create a provider component for the AuthContext
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user on app load
    checkUser();
  }, []);

  // Check current user in AsyncStorage
  const checkUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error checking user:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Sign up function
  const signUp = async (email, password) => {
    setLoading(true);
    try {
      // Create user locally
      const newUser = { 
        id: generateUniqueId(), 
        email, 
        created_at: new Date().toISOString() 
      };
      
      // Store user in AsyncStorage
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
      
      // Update state
      setUser(newUser);
      
      return { data: newUser, error: null };
    } catch (error) {
      console.error('Error signing up:', error.message);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Sign in function with password
  const signIn = async (email, password) => {
    setLoading(true);
    try {
      // Mock authentication (no actual validation)
      const user = { 
        id: generateUniqueId(), 
        email, 
        created_at: new Date().toISOString() 
      };
      
      // Store user in AsyncStorage
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      
      // Update state
      setUser(user);
      
      return { data: { user }, error: null };
    } catch (error) {
      console.error('Error signing in:', error.message);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    setLoading(true);
    try {
      // Remove user from AsyncStorage
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      
      // Update state
      setUser(null);
      
      return { error: null };
    } catch (error) {
      console.error('Error signing out:', error.message);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Create or update user profile (local only)
  const createOrUpdateUser = async (userData) => {
    try {
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userData));
      return userData;
    } catch (error) {
      console.error('Error updating user profile:', error.message);
      throw error;
    }
  };

  // Create business (local only)
  const createBusiness = async (businessData) => {
    try {
      const business = {
        id: generateUniqueId(),
        ...businessData,
        created_at: new Date().toISOString()
      };
      await AsyncStorage.setItem(BUSINESS_KEY, JSON.stringify(business));
      return business;
    } catch (error) {
      console.error('Error creating business:', error.message);
      throw error;
    }
  };

  // Add team member (local only)
  const addTeamMember = async (userData) => {
    try {
      const member = {
        id: generateUniqueId(),
        ...userData,
        created_at: new Date().toISOString()
      };
      
      // Get existing team members or initialize empty array
      const existingData = await AsyncStorage.getItem(TEAM_MEMBERS_KEY);
      const teamMembers = existingData ? JSON.parse(existingData) : [];
      
      // Add new member
      teamMembers.push(member);
      
      // Save updated list
      await AsyncStorage.setItem(TEAM_MEMBERS_KEY, JSON.stringify(teamMembers));
      return member;
    } catch (error) {
      console.error('Error adding team member:', error.message);
      throw error;
    }
  };

  // Get user profile (local only)
  const getUserProfile = async () => {
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
    } catch (error) {
      console.error('Error getting user profile:', error.message);
      throw error;
    }
  };

  // Get team members (local only)
  const getTeamMembers = async () => {
    try {
      const data = await AsyncStorage.getItem(TEAM_MEMBERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting team members:', error.message);
      throw error;
    }
  };

  // Delete team member (local only)
  const deleteTeamMember = async (userId) => {
    try {
      const data = await AsyncStorage.getItem(TEAM_MEMBERS_KEY);
      if (!data) return true;
      
      const teamMembers = JSON.parse(data);
      const updatedMembers = teamMembers.filter(member => member.id !== userId);
      
      await AsyncStorage.setItem(TEAM_MEMBERS_KEY, JSON.stringify(updatedMembers));
      return true;
    } catch (error) {
      console.error('Error deleting team member:', error.message);
      throw error;
    }
  };

  // Helper function to generate unique ID
  const generateUniqueId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  // Provide user, loading state, and auth methods to the context
  return (
    <AuthContext.Provider
      value={{
        user,
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