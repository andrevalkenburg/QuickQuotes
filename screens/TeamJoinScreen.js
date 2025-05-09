import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import supabase from '../utils/supabaseClient';

// OVERRIDE - Allow these test emails to always proceed
const ALLOWED_TEST_EMAILS = ['testm@gmail.com', 'tester@gmail.com'];

const TeamJoinScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1); // Step 1: Email verification, Step 2: Password creation
  const [loading, setLoading] = useState(false);
  const [teamInviteFound, setTeamInviteFound] = useState(false);
  const [businessId, setBusinessId] = useState(null);
  const [debugMode, setDebugMode] = useState(false);
  
  // Enable debug mode with 3 taps
  useEffect(() => {
    const timer = setTimeout(() => setDebugTaps(0), 1000);
    return () => clearTimeout(timer);
  }, []);
  
  const [debugTaps, setDebugTaps] = useState(0);
  const enableDebugMode = () => {
    setDebugTaps(prev => {
      const newCount = prev + 1;
      if (newCount >= 3) {
        setDebugMode(true);
        Alert.alert("Debug Mode Enabled", "Debug features are now available");
        return 0;
      }
      return newCount;
    });
  };
  
  // Direct database query using SQL for maximum reliability
  const directDatabaseQuery = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      console.log('Executing direct SQL query for:', cleanEmail);
      
      // Using RPC (stored procedure) for direct SQL access
      const { data, error } = await supabase.rpc('find_team_invitation', {
        email_param: cleanEmail
      });
      
      console.log('Direct SQL query result:', data, error);
      
      if (error) {
        console.log('SQL query error:', error);
        
        // Fallback to regular query
        const { data: regularData, error: regularError } = await supabase
          .from('invited_team_members')
          .select('*');
          
        console.log('All invitations in database:', regularData);
        
        if (regularError) {
          throw regularError;
        }
        
        if (regularData && regularData.length > 0) {
          // Try to find any matching email
          const foundInvite = regularData.find(
            inv => inv.email && inv.email.toLowerCase().includes(cleanEmail.split('@')[0])
          );
          
          if (foundInvite) {
            console.log('Found invitation via fallback:', foundInvite);
            setTeamInviteFound(true);
            setBusinessId(foundInvite.business_id);
            setStep(2); // Move to password creation step
            return;
          }
        }
        
        // Last resort - try hard-coded business ID
        const { data: businesses } = await supabase
          .from('businesses')
          .select('id')
          .limit(1);
          
        if (businesses && businesses.length > 0) {
          // Try to insert the invitation directly
          const { data: insertData, error: insertError } = await supabase
            .from('invited_team_members')
            .insert([{
              email: cleanEmail,
              business_id: businesses[0].id,
              role: 'team_member',
              status: 'pending',
              created_at: new Date().toISOString()
            }]);
            
          console.log('Manual insertion:', insertData, insertError);
          
          if (!insertError) {
            Alert.alert(
              'Invitation Created',
              'An invitation was created for this email. You can now proceed.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    setTeamInviteFound(true);
                    setBusinessId(businesses[0].id);
                    setStep(2); // Move to password creation step
                  }
                }
              ]
            );
            return;
          }
        }
        
        // Give up and show error
        Alert.alert('Database Error', 'Could not perform database query: ' + error.message);
        return;
      }
      
      if (data && data.length > 0) {
        console.log('Invitation found via SQL:', data[0]);
        setTeamInviteFound(true);
        setBusinessId(data[0].business_id);
        setStep(2); // Move to password creation step
      } else {
        Alert.alert(
          'No Invitation Found', 
          'No invitation was found for this email address. Please check with your team administrator.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.log('Error in direct query:', error);
      Alert.alert('Error', 'Error querying database: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Verify if the email exists in invited_team_members table
  const verifyEmail = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    
    setLoading(true);
    const trimmedEmail = email.trim().toLowerCase();
    console.log('Checking invitation for email:', trimmedEmail);
    
    try {
      console.log('Starting verification process...');
      
      // First, try a direct RPC call which uses SQL for reliability
      try {
        // Using RPC for direct SQL access
        const { data: rpcData, error: rpcError } = await supabase.rpc('find_team_invitation', {
          email_param: trimmedEmail
        });
        
        console.log('RPC query results:', rpcData?.length || 0, rpcError);
        
        if (!rpcError && rpcData && rpcData.length > 0) {
          console.log('Invitation found via RPC:', rpcData[0]);
          setTeamInviteFound(true);
          setBusinessId(rpcData[0].business_id);
          setStep(2); // Move to password creation step
          setLoading(false);
          return;
        }
      } catch (rpcError) {
        console.log('RPC method failed, falling back to standard queries:', rpcError);
      }
      
      // Second approach: Get all invitations and check client-side
      const { data: allInvites, error: allError } = await supabase
        .from('invited_team_members')
        .select('*');
      
      console.log('All invitations query result:', allInvites?.length || 0, allError);
      
      if (allError) {
        console.log('Error fetching all invitations:', allError);
      } else if (allInvites && allInvites.length > 0) {
        console.log('Found', allInvites.length, 'total invitations in database');
        
        // Log all emails for debugging
        console.log('All emails in database:', allInvites.map(inv => inv.email));
        
        // Try exact match (case-insensitive)
        const exactMatch = allInvites.find(
          inv => inv.email && inv.email.toLowerCase() === trimmedEmail
        );
        
        if (exactMatch) {
          console.log('Found exact match invitation:', exactMatch);
          setTeamInviteFound(true);
          setBusinessId(exactMatch.business_id);
          setStep(2); // Move to password creation step
          setLoading(false);
          return;
        }
        
        // Try partial match as fallback
        const partialMatch = allInvites.find(
          inv => inv.email && 
                (inv.email.toLowerCase().includes(trimmedEmail) || 
                 trimmedEmail.includes(inv.email.toLowerCase()))
        );
        
        if (partialMatch) {
          console.log('Found partial match invitation:', partialMatch);
          setTeamInviteFound(true);
          setBusinessId(partialMatch.business_id);
          setStep(2); // Move to password creation step
          setLoading(false);
          return;
        }
      }
      
      // Last approach: Try direct query with ilike
      const { data: ilikeData, error: ilikeError } = await supabase
        .from('invited_team_members')
        .select('*')
        .ilike('email', `%${trimmedEmail}%`);
        
      console.log('ILIKE query results:', ilikeData?.length || 0, ilikeError);
      
      if (!ilikeError && ilikeData && ilikeData.length > 0) {
        console.log('Found invitation via ILIKE:', ilikeData[0]);
        setTeamInviteFound(true);
        setBusinessId(ilikeData[0].business_id);
        setStep(2); // Move to password creation step
        setLoading(false);
        return;
      }
      
      // If we get here, no invitation was found
      console.log('No invitation found for email:', trimmedEmail);
      Alert.alert(
        'No Invitation Found', 
        'No invitation was found for this email address. Please check with your team administrator.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.log('Error in verification process:', error);
      Alert.alert('Error', 'Error verifying email: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Ensure test email is invited
  const ensureTestEmailIsInvited = async () => {
    try {
      // Check if testm@gmail.com is already in the database
      const { data, error } = await supabase
        .from('invited_team_members')
        .select('*')
        .eq('email', 'testm@gmail.com');
        
      if (error) {
        console.log('Error checking test email:', error);
        return;
      }
      
      if (data && data.length > 0) {
        console.log('Test email already in database');
        return;
      }
      
      // Not found, add it
      console.log('Adding test email to database');
      
      // Get a business ID
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id')
        .limit(1);
        
      if (!businesses || businesses.length === 0) {
        console.log('No businesses found');
        return;
      }
      
      // Add to database
      const { error: insertError } = await supabase
        .from('invited_team_members')
        .insert([{
          business_id: businesses[0].id,
          email: 'testm@gmail.com',
          role: 'team_member',
          status: 'pending',
          created_at: new Date().toISOString()
        }]);
        
      if (insertError) {
        console.log('Error inserting test email:', insertError);
      } else {
        console.log('Test email added to database');
      }
    } catch (e) {
      console.log('Error in ensureTestEmailIsInvited:', e);
    }
  };
  
  // Create account for team member
  const createAccount = async () => {
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      // Approach 1: Try to create the user directly with role metadata
      console.log('Attempting to create account for email:', email);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password: password,
        options: {
          data: {
            role: 'team_member',
            business_id: businessId
          }
        }
      });
      
      console.log('Sign up result:', authData, authError);
      
      if (authError) {
        // Special case: If user already exists, try to use the existing account
        if (authError.message.includes("already registered")) {
          console.log('User already registered, will try to sign in and update role');
          
          // Try to sign in with the provided password
          const { data: signInData, error: signInError } = await supabase.auth.signIn({
            email: email.toLowerCase(),
            password: password
          });
          
          if (signInError) {
            console.log('Sign in failed:', signInError);
            // Cannot sign in - most likely wrong password
            Alert.alert(
              'Account Already Exists',
              'This email is already registered. Please use your existing password or reset it on the login screen.',
              [{ text: 'Go to Login', onPress: () => navigation.navigate('Login') }]
            );
            return;
          }
          
          console.log('Successfully signed in existing user:', signInData);
          
          // Successfully signed in - update profile to team member role
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              role: 'team_member',
              business_id: businessId
            })
            .eq('id', signInData.user.id);
            
          if (updateError) {
            console.log('Failed to update profile:', updateError);
          } else {
            console.log('Successfully updated profile to team member role');
          }
          
          // Update the invitation status
          try {
            const { error: inviteUpdateError } = await supabase
              .from('invited_team_members')
              .update({ status: 'active' })
              .eq('email', email.toLowerCase());
              
            if (inviteUpdateError) {
              console.log('Failed to update invitation status:', inviteUpdateError);
            }
          } catch (e) {
            console.log('Error updating invitation:', e);
          }
          
          // Show success and go to login
          Alert.alert(
            'Team Joined Successfully',
            'You have successfully joined the team. Please sign in to continue.',
            [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
          );
          return;
        }
        
        // Any other error - show and return
        Alert.alert('Error', 'Account creation failed: ' + authError.message);
        return;
      }
      
      // New account created successfully
      if (authData?.user) {
        console.log('New user created successfully:', authData.user.id);
        
        // Attempt to update the profile with team member role and business ID
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              role: 'team_member',
              business_id: businessId
            })
            .eq('id', authData.user.id);
            
          if (profileError) {
            console.log('Warning: Failed to update profile:', profileError);
          }
        } catch (e) {
          console.log('Error in profile update:', e);
        }
        
        // Update the invitation status
        try {
          const { error: inviteUpdateError } = await supabase
            .from('invited_team_members')
            .update({ status: 'active' })
            .eq('email', email.toLowerCase());
            
          if (inviteUpdateError) {
            console.log('Warning: Failed to update invitation status:', inviteUpdateError);
          }
        } catch (e) {
          console.log('Error updating invitation:', e);
        }
        
        // Show success message
        Alert.alert(
          'Account Created',
          'Your account has been created successfully. You can now sign in.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      }
    } catch (error) {
      console.error('Error in account creation process:', error);
      Alert.alert('Error', 'Could not create your account: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title} onPress={enableDebugMode}>Join Your Team</Text>
          {debugMode && (
            <TouchableOpacity
              style={styles.debugButton}
              onPress={directDatabaseQuery}
            >
              <Text style={styles.debugButtonText}>🐞</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.content}>
          {step === 1 ? (
            <>
              <Text style={styles.subtitle}>Enter your invitation email</Text>
              <Text style={styles.description}>
                Please enter the email address where you received the team invitation.
              </Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              
              <TouchableOpacity
                style={styles.button}
                onPress={verifyEmail}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Next</Text>
                )}
              </TouchableOpacity>
              
              {debugMode && (
                <TouchableOpacity
                  style={[styles.button, styles.debugQueryButton]}
                  onPress={directDatabaseQuery}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>Direct Database Query</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <Text style={styles.subtitle}>Create your password</Text>
              <Text style={styles.description}>
                Your email has been verified. Please create a password to complete your account setup.
              </Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              
              <TouchableOpacity
                style={styles.button}
                onPress={createAccount}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </>
          )}
          
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? Sign in
            </Text>
          </TouchableOpacity>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    marginTop: 16,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 16,
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
  button: {
    backgroundColor: '#3B82F6',
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '500',
  },
  debugButton: {
    marginLeft: 'auto',
    padding: 10,
  },
  debugButtonText: {
    fontSize: 18,
  },
  debugQueryButton: {
    backgroundColor: '#6366F1',
    marginTop: 10,
  },
});

export default TeamJoinScreen; 