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
      
      // Update the user's profile with business_id and ensure role is set to 'owner'
      try {
        console.log('Updating user profile with business_id:', data[0].id);
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            business_id: data[0].id,
            role: 'owner'
          })
          .eq('id', user.id);
          
        if (profileError) {
          console.error('Failed to update profile with business_id:', profileError);
          // Continue execution even if this fails - don't throw
        } else {
          console.log('Successfully updated profile with business_id');
          
          // Update local profile data
          const userProfileData = await AsyncStorage.getItem(USER_PROFILE_KEY);
          if (userProfileData) {
            const profileData = JSON.parse(userProfileData);
            profileData.business_id = data[0].id;
            profileData.role = 'owner';
            await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profileData));
          }
        }
      } catch (profileUpdateError) {
        console.error('Error updating profile with business_id:', profileUpdateError);
        // Continue execution even if this fails - don't throw
      }
      
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
      // Get current business ID
      const businessData = await AsyncStorage.getItem(BUSINESS_KEY);
      if (!businessData) {
        throw new Error('No business found. Please create a business first.');
      }
      
      const business = JSON.parse(businessData);
      console.log('Adding team member for business ID:', business.id);
      console.log('Team member data:', userData);
      
      // First check if table exists
      console.log('Verifying invited_team_members table...');
      const { data: tableCheck, error: tableError } = await supabase
        .from('invited_team_members')
        .select('count(*)', { count: 'exact', head: true });
        
      console.log('Table check result:', tableCheck, tableError);
      
      if (tableError && tableError.message.includes('does not exist')) {
        console.log('Table does not exist, creating...');
        // Table doesn't exist - try to create it via RPC if possible
        // This is just a fallback
        alert('The team members table is not properly set up. Please contact support.');
        throw new Error('invited_team_members table does not exist');
      }
      
      // Add to invited_team_members table
      console.log('Inserting team member into invited_team_members table...');
      const { data, error } = await supabase
        .from('invited_team_members')
        .insert([{
          business_id: business.id,
          email: userData.email.toLowerCase().trim(),
          role: 'team_member',
          invited_by: user.id,
          status: 'pending',
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) {
        console.log('Error inserting team member:', error);
        throw error;
      }
      
      console.log('Insert successful, data:', data);
      
      // Get existing team members or initialize empty array for local storage
      const existingData = await AsyncStorage.getItem(TEAM_MEMBERS_KEY);
      const teamMembers = existingData ? JSON.parse(existingData) : [];
      
      // Add new member to local storage
      const newMember = {
        id: data && data[0] ? data[0].id : Date.now().toString(), // Use returned ID or generate one
        email: userData.email,
        name: userData.name || null, // Store name in local storage only
        status: 'Invited'
      };
      
      const updatedMembers = [...teamMembers, newMember];
      await AsyncStorage.setItem(TEAM_MEMBERS_KEY, JSON.stringify(updatedMembers));
      
      return newMember;
    } catch (error) {
      console.log('addTeamMember error:', error);
      throw error;
    }
  };

  // Get user profile from Supabase
  const getUserProfile = async () => {
    try {
      console.log('Getting user profile for ID:', user?.id);
      
      // Get basic profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile data:', profileError);
        throw profileError;
      }
      
      console.log('Profile data retrieved:', profileData);
      
      // If the user is a team member, we need to ensure we have the business_id
      if (profileData.role === 'team_member') {
        console.log('User is a team member, retrieving business info');
        
        if (profileData.business_id) {
          console.log('Team member has business_id:', profileData.business_id);
          
          // Get the business details
          const { data: businessData } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', profileData.business_id)
            .single();
            
          console.log('Team member business data:', businessData);
          
          // Update local storage
          await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profileData));
          if (businessData) {
            await AsyncStorage.setItem(BUSINESS_KEY, JSON.stringify(businessData));
          }
          
          return {
            ...profileData,
            business: businessData || null
          };
        }
      }
      
      // For owners, get their business data
      console.log('Looking up business where user is owner_id:', user.id);
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (businessError && !businessError.message.includes('No rows found')) {
        console.error('Error fetching business data:', businessError);
      }
      
      console.log('Business data retrieved:', businessData);
      
      // If we have business data but profile doesn't have business_id, update it
      if (businessData && !profileData.business_id) {
        console.log('Updating profile with business_id:', businessData.id);
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ business_id: businessData.id })
          .eq('id', user.id);
          
        if (updateError) {
          console.error('Error updating profile with business_id:', updateError);
        } else {
          console.log('Successfully updated profile with business_id');
          profileData.business_id = businessData.id;
        }
      }
      
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
        console.log('Falling back to local storage for profile data');
        const profileData = await AsyncStorage.getItem(USER_PROFILE_KEY);
        const businessData = await AsyncStorage.getItem(BUSINESS_KEY);
        
        if (!profileData) {
          console.log('No profile data found in local storage');
          return null;
        }
        
        const profile = JSON.parse(profileData);
        const business = businessData ? JSON.parse(businessData) : null;
        
        console.log('Retrieved from storage - Profile:', profile, 'Business:', business);
        
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
      console.log('Getting team members...');
      
      // Get business ID
      const businessData = await AsyncStorage.getItem(BUSINESS_KEY);
      if (!businessData) {
        console.log('No business data found in storage');
        return [];
      }
      
      const business = JSON.parse(businessData);
      const businessId = business.id;
      
      console.log('Fetching team members for business ID:', businessId);
      
      // Step 1: Get active team members from profiles table
      const { data: activeMembers, error: activeError } = await supabase
        .from('profiles')
        .select('*')
        .eq('business_id', businessId)
        .eq('role', 'team_member');
      
      if (activeError) {
        console.error('Error fetching active team members:', activeError);
      } else {
        console.log('Active team members found:', activeMembers?.length || 0, activeMembers);
      }
      
      // Step 2: Get invited team members
      const { data: invitedMembers, error: invitedError } = await supabase
        .from('invited_team_members')
        .select('*')
        .eq('business_id', businessId);

      if (invitedError) {
        console.error('Error fetching invited team members:', invitedError);
      } else {
        console.log('Invited team members found:', invitedMembers?.length || 0, invitedMembers);
      }
      
      // Step 3: Format both sets of members
      const formattedActiveMembers = (activeMembers || []).map(member => ({
        id: member.id,
        name: member.full_name || member.name || 'Unnamed Member',
        email: member.email,
        status: 'Active',
        role: member.role,
        business_id: member.business_id,
        type: 'profile', // Used to distinguish the source
        dateAdded: member.created_at || new Date().toISOString()
      }));
      
      const formattedInvitedMembers = (invitedMembers || []).map(member => ({
        id: member.id,
        name: member.name || 'Invited Member',
        email: member.email,
        status: 'Invited',
        role: 'team_member',
        business_id: member.business_id,
        type: 'invitation', // Used to distinguish the source
        dateAdded: member.created_at || new Date().toISOString()
      }));
      
      // Step 4: Combine and deduplicate (in case someone is both invited and active)
      const allMembers = [...formattedActiveMembers];
      
      // Only add invited members who aren't already in the active list
      for (const invitedMember of formattedInvitedMembers) {
        const alreadyActive = formattedActiveMembers.some(
          activeMember => activeMember.email.toLowerCase() === invitedMember.email.toLowerCase()
        );
        
        if (!alreadyActive) {
          allMembers.push(invitedMember);
        }
      }
      
      console.log('Combined team members:', allMembers.length, allMembers);

      // Update local storage
      await AsyncStorage.setItem(TEAM_MEMBERS_KEY, JSON.stringify(allMembers));
      return allMembers;
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
        .from('invited_team_members')
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