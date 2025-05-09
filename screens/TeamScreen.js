import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  FlatList,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../utils/AuthContext';
import supabase from '../utils/supabaseClient';

// Storage key for team members
const TEAM_STORAGE_KEY = 'quickquote_team_members';
const BUSINESS_KEY = 'quickquote_business';
const USER_PROFILE_KEY = 'quickquote_user_profile';

// Function to directly add a member to the database
const addMemberToDatabase = async (email, businessId) => {
  try {
    console.log('AddMemberToDatabase called with email:', email, 'businessId:', businessId);
    
    if (!businessId) {
      console.log('No business ID provided, retrieving from storage');
      
      // Try to get business ID from storage
      const businessData = await AsyncStorage.getItem(BUSINESS_KEY);
      if (!businessData) {
        console.log('No business found in BUSINESS_KEY');
        throw new Error('No business found in storage');
      } 
      
      const business = JSON.parse(businessData);
      businessId = business.id;
      console.log('Retrieved business ID from storage:', businessId);
    }
    
    if (!businessId) {
      console.log('Still no business ID found, trying to get one from the database');
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id')
        .limit(1);
        
      if (businesses && businesses.length > 0) {
        businessId = businesses[0].id;
        console.log('Found business ID from database:', businessId);
      } else {
        throw new Error('Could not find a business ID');
      }
    }
    
    console.log('Adding member to database directly:', email, 'for business:', businessId);
    
    const { data, error } = await supabase
      .from('invited_team_members')
      .insert([{
        business_id: businessId,
        email: email.toLowerCase().trim(),
        role: 'team_member',
        status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select();
      
    if (error) {
      console.log('Error inserting team member directly:', error);
      return { success: false, error };
    }
    
    console.log('Direct database insert successful:', data);
    return { success: true, data };
  } catch (error) {
    console.log('Error in direct addition:', error);
    return { success: false, error };
  }
};

const TeamScreen = () => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState(null);
  const [userRole, setUserRole] = useState('');
  const { 
    addTeamMember: inviteTeamMember, 
    getUserProfile, 
    getTeamMembers, 
    deleteTeamMember: deleteTeamMemberFromContext 
  } = useAuth();

  // Load user profile and team members on component mount
  useEffect(() => {
    const loadUserAndMembers = async () => {
      try {
        setLoading(true);
        console.log('Loading user profile and team members...');
        
        // Get current user profile to determine business ID and role
        const userProfile = await getUserProfile();
        console.log('User profile loaded:', userProfile);
        
        if (userProfile) {
          setUserRole(userProfile.role || '');
          console.log('User role set to:', userProfile.role || 'undefined');
          
          // Get business ID from profile or from business object
          let currentBusinessId = userProfile.business_id;
          
          // If business_id is not directly in profile, try to get it from business object
          if (!currentBusinessId && userProfile.business) {
            currentBusinessId = userProfile.business.id;
          }
          
          console.log('Determined business ID:', currentBusinessId);
          
          if (currentBusinessId) {
            setBusinessId(currentBusinessId);
            console.log('Business ID set, loading team members for:', currentBusinessId);
            
            // Load team members using the AuthContext function instead of direct database queries
            const members = await getTeamMembers();
            console.log('Team members loaded from auth context:', members);
            
            if (members && members.length > 0) {
              setTeamMembers(members);
              await saveTeamMembers(members);
            } else {
              console.log('No team members returned from getTeamMembers');
            }
          } else {
            // Fallback to loading business ID from local storage
            try {
              const businessData = await AsyncStorage.getItem(BUSINESS_KEY);
              if (businessData) {
                const business = JSON.parse(businessData);
                if (business && business.id) {
                  console.log('Using business ID from storage:', business.id);
                  setBusinessId(business.id);
                  
                  // Load team members using the AuthContext function
                  const members = await getTeamMembers();
                  if (members && members.length > 0) {
                    setTeamMembers(members);
                    await saveTeamMembers(members);
                  }
                } else {
                  console.error('No valid business ID in storage');
                }
              } else {
                console.error('No business data in storage');
              }
            } catch (storageError) {
              console.error('Error reading business from storage:', storageError);
            }
          }
        } else {
          console.error('No user profile returned');
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserAndMembers();
  }, []);

  // Load team members from database based on business ID
  const loadTeamMembersFromDatabase = async (business_id) => {
    try {
      console.log('Loading team members for business ID:', business_id);
      
      // Load all profiles with matching business_id (both owners and team members)
      const { data: profileMembers, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('business_id', business_id);
        
      if (profileError) {
        console.error('Error loading profiles:', profileError);
      } else {
        console.log('Profiles found:', profileMembers?.length || 0, profileMembers);
      }
      
      // Extract active team members (role = team_member)
      const activeMembers = (profileMembers || []).filter(member => 
        member.role === 'team_member'
      );
      
      // Load invited team members from invited_team_members table
      const { data: invitedMembers, error: invitedError } = await supabase
        .from('invited_team_members')
        .select('*')
        .eq('business_id', business_id)
        .eq('status', 'pending');
        
      if (invitedError) {
        console.error('Error loading invited team members:', invitedError);
      } else {
        console.log('Invited members found:', invitedMembers?.length || 0, invitedMembers);
      }
      
      // Transform and combine both sets of members
      const formattedActiveMembers = (activeMembers || []).map(member => ({
        id: member.id,
        name: member.full_name || member.name || 'Unnamed Member',
        email: member.email,
        status: 'Active',
        dateAdded: member.created_at || new Date().toISOString()
      }));
      
      const formattedInvitedMembers = (invitedMembers || []).map(member => ({
        id: member.id,
        name: member.name || 'Invited Member',
        email: member.email,
        status: 'Invited',
        dateAdded: member.created_at || new Date().toISOString()
      }));
      
      // Combine both arrays
      const allMembers = [...formattedActiveMembers, ...formattedInvitedMembers];
      
      console.log('Combined team members:', allMembers.length, allMembers);
      
      // Update state and storage
      setTeamMembers(allMembers);
      await AsyncStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(allMembers));
      
      console.log(`Loaded ${formattedActiveMembers.length} active members and ${formattedInvitedMembers.length} invited members`);
      
    } catch (error) {
      console.error('Error loading team members from database:', error);
    }
  };

  // Load team members from storage (fallback)
  const loadTeamMembers = async () => {
    try {
      const storedMembers = await AsyncStorage.getItem(TEAM_STORAGE_KEY);
      if (storedMembers) {
        setTeamMembers(JSON.parse(storedMembers));
      }
    } catch (error) {
      console.error('Error loading team members from storage:', error);
    }
  };

  // Save team members to storage
  const saveTeamMembers = async (members) => {
    try {
      await AsyncStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(members));
    } catch (error) {
      console.error('Error saving team members:', error);
    }
  };

  // Add a new team member
  const addTeamMember = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!businessId) {
      Alert.alert('Error', 'Business ID not found. Please try again.');
      return;
    }

    try {
      // Normalize the email to lowercase
      const cleanEmail = email.trim().toLowerCase();
      console.log('Attempting to add team member:', cleanEmail, 'to business:', businessId);
      
      // First check if this email is already invited
      const { data: existingInvites } = await supabase
        .from('invited_team_members')
        .select('*')
        .eq('email', cleanEmail)
        .eq('business_id', businessId);
        
      if (existingInvites && existingInvites.length > 0) {
        console.log('This email is already invited:', existingInvites);
        Alert.alert(
          'Already Invited',
          'This email address has already been invited to your team.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Check if this email already exists as an active member
      const { data: existingProfiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .eq('business_id', businessId);
        
      if (existingProfiles && existingProfiles.length > 0) {
        console.log('This email already exists as an active member:', existingProfiles);
        Alert.alert(
          'Already a Member',
          'This email address is already an active member of your team.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Add directly to the database with specific business ID
      console.log('Adding member directly to database for business:', businessId);
      const dbResult = await addMemberToDatabase(cleanEmail, businessId);
      
      if (!dbResult.success) {
        console.log('Direct database insert failed, trying through Auth context');
        
        // Invite team member using Auth context as fallback
        const result = await inviteTeamMember({
          name: name.trim(),
          email: cleanEmail
        });
        
        console.log('inviteTeamMember result:', result);
      } else {
        console.log('Direct database insert successful');
      }

      // Create local member entry
      const newMember = {
        id: dbResult.success && dbResult.data ? dbResult.data[0].id : Date.now().toString(),
        name: name.trim(),
        email: cleanEmail,
        dateAdded: new Date().toISOString(),
        status: 'Invited'
      };

      const updatedMembers = [...teamMembers, newMember];
      setTeamMembers(updatedMembers);
      await saveTeamMembers(updatedMembers);

      // Show success message
      Alert.alert(
        "Team Member Invited", 
        `${name.trim()} has been invited. They can join by clicking "Joining your team?" on the login screen.`
      );

      // Clear form fields
      setName('');
      setEmail('');
      setIsAddingMember(false);
    } catch (error) {
      console.error('Error adding team member:', error);
      Alert.alert("Error", "Failed to invite team member: " + error.message);
    }
  };
  
  // Delete a team member
  const deleteTeamMember = (id, status, type) => {
    Alert.alert(
      status === "Invited" ? "Cancel Invitation" : "Remove Team Member",
      `Are you sure you want to ${status === "Invited" ? "cancel this invitation" : "remove this team member"}?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              console.log(`Deleting team member with ID: ${id}, status: ${status}, type: ${type}`);
              
              if (type === "invitation" || status === "Invited") {
                console.log('Removing invitation from invited_team_members table');
                
                // Use the AuthContext function for invited members
                const deleteResult = await deleteTeamMemberFromContext(id);
                console.log('Delete invitation result:', deleteResult);
                
                // Delete from invited_team_members table
                const { error } = await supabase
                  .from('invited_team_members')
                  .delete()
                  .eq('id', id);
                  
                if (error) {
                  console.error('Error deleting invitation:', error);
                  throw error;
                }
              } else if (type === "profile" || status === "Active") {
                console.log('Removing business_id from profile');
                
                // Update the profile to remove business_id
                const { error } = await supabase
                  .from('profiles')
                  .update({ business_id: null })
                  .eq('id', id);
                  
                if (error) {
                  console.error('Error removing team member:', error);
                  throw error;
                }
              }
              
              // Update local state
              const updatedMembers = teamMembers.filter(member => member.id !== id);
              setTeamMembers(updatedMembers);
              await saveTeamMembers(updatedMembers);
              
              // Refresh the team members list
              const refreshedMembers = await getTeamMembers();
              if (refreshedMembers && refreshedMembers.length > 0) {
                setTeamMembers(refreshedMembers);
                await saveTeamMembers(refreshedMembers);
              }
              
              Alert.alert(
                "Success", 
                status === "Invited" 
                  ? "Invitation has been cancelled" 
                  : "Team member has been removed"
              );
              
            } catch (error) {
              console.error('Error removing team member:', error);
              Alert.alert("Error", "Failed to remove team member: " + error.message);
            }
          }
        }
      ]
    );
  };

  // Render a team member row
  const renderTeamMember = ({ item }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name || 'Unnamed Member'}</Text>
        <Text style={styles.memberEmail}>{item.email}</Text>
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusTag, 
            item.status === 'Active' ? styles.activeStatusTag : styles.invitedStatusTag
          ]}>
            <Text style={[
              styles.statusText,
              item.status === 'Active' ? styles.activeStatusText : styles.invitedStatusText
            ]}>
              {item.status}
            </Text>
          </View>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => deleteTeamMember(item.id, item.status, item.type || (item.status === 'Active' ? 'profile' : 'invitation'))}
      >
        <MaterialIcons name="delete" size={22} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidContainer}
      >
        <AppHeader subtitle="Team Management" />
        
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading team members...</Text>
            </View>
          ) : (
            <>
              {isAddingMember ? (
                <View style={styles.addMemberForm}>
                  <Text style={styles.sectionTitle}>Add Team Member</Text>
                  
                  <TextInput
                    style={styles.input}
                    placeholder="Name"
                    value={name}
                    onChangeText={setName}
                    placeholderTextColor="#9CA3AF"
                  />
                  
                  <TextInput
                    style={styles.input}
                    placeholder="Email *"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor="#9CA3AF"
                  />
                  
                  <View style={styles.buttonRow}>
                    <TouchableOpacity 
                      style={[styles.button, styles.cancelButton]}
                      onPress={() => {
                        setIsAddingMember(false);
                        setName('');
                        setEmail('');
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.button, styles.addButton]}
                      onPress={addTeamMember}
                    >
                      <Text style={styles.addButtonText}>Add Member</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.addMemberButton}
                  onPress={() => setIsAddingMember(true)}
                >
                  <MaterialIcons name="person-add" size={24} color="white" />
                  <Text style={styles.addMemberButtonText}>Add Team Member</Text>
                </TouchableOpacity>
              )}
              
              <View style={styles.teamMembersList}>
                <Text style={styles.sectionTitle}>
                  Team Members ({teamMembers.length})
                </Text>
                
                {teamMembers.length === 0 ? (
                  <Text style={styles.emptyMessage}>
                    No team members added yet.
                  </Text>
                ) : (
                  <FlatList
                    data={teamMembers}
                    renderItem={renderTeamMember}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.membersList}
                  />
                )}
              </View>
              
              <View style={styles.infoBox}>
                <MaterialIcons name="info-outline" size={20} color="#3B82F6" style={styles.infoIcon} />
                <Text style={styles.infoText}>
                  Team members can create and edit quotes but cannot access reports or team management.
                </Text>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  keyboardAvoidContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  addMemberButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  addMemberForm: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  input: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    fontSize: 16,
    color: '#111827',
    ...Platform.select({
      ios: {
        paddingTop: 12,
        paddingBottom: 12,
      },
      android: {
        textAlignVertical: 'center',
      }
    }),
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '48%',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#3B82F6',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  teamMembersList: {
    flex: 1,
  },
  membersList: {
    paddingBottom: 16,
  },
  memberCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusTag: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  statusText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
    alignSelf: 'center',
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 24,
    fontSize: 15,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    color: '#1E40AF',
    fontSize: 14,
    lineHeight: 20,
  },
  debugButton: {
    backgroundColor: '#EF4444',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4B5563',
  },
  activeStatusTag: {
    backgroundColor: '#DCFCE7', // Green background for active members
  },
  invitedStatusTag: {
    backgroundColor: '#DBEAFE', // Blue background for invited members
  },
  activeStatusText: {
    color: '#15803D', // Green text for active members
  },
  invitedStatusText: {
    color: '#2563EB', // Blue text for invited members
  },
});

export default TeamScreen; 