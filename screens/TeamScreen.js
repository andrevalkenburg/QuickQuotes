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
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from '../components/AppHeader';

// Storage key for team members
const TEAM_STORAGE_KEY = 'quickquote_team_members';

const TeamScreen = () => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [canAccessReports, setCanAccessReports] = useState(false);
  const [canManageTeam, setCanManageTeam] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Load team members on component mount
  useEffect(() => {
    loadTeamMembers();
  }, []);

  // Load team members from storage
  const loadTeamMembers = async () => {
    try {
      const storedMembers = await AsyncStorage.getItem(TEAM_STORAGE_KEY);
      if (storedMembers) {
        setTeamMembers(JSON.parse(storedMembers));
      }
    } catch (error) {
      console.error('Error loading team members:', error);
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

    const newMember = {
      id: Date.now().toString(),
      name: name.trim(),
      email: email.trim(),
      canAccessReports,
      canManageTeam,
      dateAdded: new Date().toISOString()
    };

    const updatedMembers = [...teamMembers, newMember];
    setTeamMembers(updatedMembers);
    await saveTeamMembers(updatedMembers);

    // Clear form fields
    setName('');
    setEmail('');
    setCanAccessReports(false);
    setCanManageTeam(false);
    setIsAddingMember(false);
  };

  // Delete a team member
  const deleteTeamMember = (id) => {
    Alert.alert(
      "Remove Team Member",
      "Are you sure you want to remove this team member? Their account will remain active until the end of the current billing month.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const updatedMembers = teamMembers.filter(member => member.id !== id);
            setTeamMembers(updatedMembers);
            await saveTeamMembers(updatedMembers);
          }
        }
      ]
    );
  };

  // Render a team member item
  const renderTeamMember = ({ item }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name}</Text>
        <Text style={styles.memberEmail}>{item.email}</Text>
        <View style={styles.permissionsContainer}>
          {item.canAccessReports && (
            <View style={styles.permissionTag}>
              <Text style={styles.permissionText}>Reports Access</Text>
            </View>
          )}
          {item.canManageTeam && (
            <View style={styles.permissionTag}>
              <Text style={styles.permissionText}>Team Management</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => deleteTeamMember(item.id)}
      >
        <MaterialIcons name="delete" size={22} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  // Checkbox component
  const Checkbox = ({ label, value, onValueChange }) => (
    <TouchableOpacity 
      style={styles.checkboxContainer}
      onPress={() => onValueChange(!value)}
    >
      <View style={[styles.checkbox, value && styles.checkboxChecked]}>
        {value && <MaterialIcons name="check" size={16} color="white" />}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );

  // Calculate the current billing period end date (end of month)
  const getBillingEndDate = () => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return lastDay.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidContainer}
      >
        <AppHeader subtitle="Team Management" />
        
        <View style={styles.content}>
          {isAddingMember ? (
            <View style={styles.addMemberForm}>
              <Text style={styles.sectionTitle}>Add Team Member</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Name"
                value={name}
                onChangeText={setName}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Email *"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              
              <Text style={styles.permissionsTitle}>Permissions</Text>
              
              <Checkbox 
                label="Can access reports" 
                value={canAccessReports} 
                onValueChange={setCanAccessReports} 
              />
              
              <Checkbox 
                label="Can manage team members" 
                value={canManageTeam} 
                onValueChange={setCanManageTeam} 
              />
              
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setIsAddingMember(false);
                    setName('');
                    setEmail('');
                    setCanAccessReports(false);
                    setCanManageTeam(false);
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
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No team members added yet. Add your first team member to get started.
                </Text>
              </View>
            ) : (
              <FlatList
                data={teamMembers}
                renderItem={renderTeamMember}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
              />
            )}
          </View>
          
          {teamMembers.length > 0 && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Note: When you remove a team member, their account will remain active until the end of the current billing period ({getBillingEndDate()}).
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardAvoidContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  addMemberButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  addMemberButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  addMemberForm: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  permissionsTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: 'white',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#4B5563',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#4B5563',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  teamMembersList: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    color: '#6B7280',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: 8,
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  permissionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  permissionTag: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginRight: 6,
    marginBottom: 4,
  },
  permissionText: {
    fontSize: 12,
    color: '#3B82F6',
  },
  deleteButton: {
    padding: 8,
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoText: {
    color: '#1E40AF',
    fontSize: 14,
    lineHeight: 20,
  }
});

export default TeamScreen; 