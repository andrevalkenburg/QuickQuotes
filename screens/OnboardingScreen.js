import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import globalState from '../utils/globalState';
import { useAuth } from '../utils/AuthContext';

const OnboardingScreen = ({ navigation }) => {
  // State management
  const [currentStep, setCurrentStep] = useState(1);
  
  // Extract all needed auth functions at the component level
  const { signUp, createOrUpdateUser, createBusiness, user } = useAuth();
  
  // Form values
  const [formValues, setFormValues] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    businessAddress: '',
    businessPhone: '',
    businessEmail: '',
    businessLogo: null,
    // New banking fields for Paystack sub-account
    bankName: '',
    accountNumber: '',
    accountName: '',
    bvn: '', // Bank Verification Number
    acceptPaystackTerms: false
  });

  // Loading state for signup
  const [loading, setLoading] = useState(false);

  // Request permission for camera roll access
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to upload your logo!');
      }
    })();
  }, []);

  // Update form values
  const updateForm = (field, value) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Navigate to next step
  const nextStep = async () => {
    // Validate fields in step 1
    if (currentStep === 1) {
      if (!formValues.fullName) {
        Alert.alert('Error', 'Full name is required');
        return;
      }
      
      if (!formValues.email) {
        Alert.alert('Error', 'Email address is required');
        return;
      }
      
      if (!formValues.password) {
        Alert.alert('Error', 'Password is required');
        return;
      }
      
      if (formValues.password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return;
      }
      
      if (formValues.password !== formValues.confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
      
      // Create account with Supabase
      setLoading(true);
      try {
        console.log('Creating account for:', formValues.email);
        
        // Use Supabase signUp for v1.35.7 with proper parameters
        const { data, error } = await signUp(
          formValues.email, 
          formValues.password,
          {
            data: {
              full_name: formValues.fullName,
            }
          }
        );
        
        if (error) {
          throw error;
        }
        
        console.log('User signed up successfully:', data);
        
        // Give a moment for session to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify user is logged in before proceeding
        if (!user || !user.id) {
          console.log('User not properly authenticated after signup, moving to step 2 anyway');
          // We will move to step 2 anyway and handle auth state later
        }
        
        // Move to next step
        setCurrentStep(prev => prev + 1);
      } catch (error) {
        console.error('Signup error:', error);
        Alert.alert('Error', error.message || 'Failed to create account. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  // Handle PayFast setup choice
  const handlePayFastChoice = (setupNow) => {
    updateForm('setupPayFast', setupNow);
    if (!setupNow) {
      // Skip to finish if they don't want to set up PayFast now
      handleFinish();
    }
  };

  // Handle finish (submit and create user profile and business)
  const handleFinish = async () => {
    console.log('Onboarding complete!', formValues);
    
    // Set loading state
    setLoading(true);
    
    try {
      console.log('Current user:', user);
      
      // If user is not authenticated yet, attempt to get the user from session
      // This is a workaround for when user signup succeeded but auth state isn't updated yet
      if (!user?.id) {
        // Show a message that we're finalizing account setup
        Alert.alert(
          "Finalizing Setup",
          "Your account is being set up. Please try again in a moment.",
          [{ text: "OK", onPress: () => setCurrentStep(1) }]
        );
        setLoading(false);
        return;
      }
      
      // First, create the user profile
      try {
        // Create user profile in Supabase
        const profileData = {
          full_name: formValues.fullName,
          email: formValues.email,
          avatar_url: null
        };
        
        console.log('Creating user profile with data:', profileData);
        await createOrUpdateUser(profileData);
        console.log('User profile created successfully');
      } catch (profileError) {
        console.error('Profile creation error:', profileError);
        Alert.alert(
          "Error",
          "There was an issue creating your profile. " + profileError.message,
          [{ text: "OK" }]
        );
        setLoading(false);
        return;
      }
      
      // Now, try to create the business
      try {
        // Create business in Supabase
        const businessData = {
          name: formValues.businessName,
          address: formValues.businessAddress,
          phone: formValues.businessPhone,
          email: formValues.businessEmail,
          logo_url: formValues.businessLogo,
          // Banking details
          bank_name: formValues.bankName,
          account_number: formValues.accountNumber,
          account_name: formValues.accountName,
          bvn: formValues.bvn
        };
        
        console.log('Creating business with data:', businessData);
        const business = await createBusiness(businessData);
        console.log('Business created successfully:', business);
        
        // Show success message
        Alert.alert(
          "Success",
          "Your account has been set up successfully!",
          [{ text: "OK", onPress: () => navigation.navigate('Main') }]
        );
      } catch (businessError) {
        console.error('Business creation error:', businessError);
        
        // If there's an RLS policy error, show a specific message but still navigate
        if (businessError.message && businessError.message.includes('policy')) {
          Alert.alert(
            "Account Created",
            "Your account was created, but there was an issue with business setup. " +
            "You can complete this later in your profile settings.",
          [{ text: "OK", onPress: () => navigation.navigate('Main') }]
        );
      } else {
        Alert.alert(
            "Partial Setup Complete",
            "Your account was created, but we couldn't set up your business details. " +
            "You can add these later in settings.",
            [{ text: "OK", onPress: () => navigation.navigate('Main') }]
        );
        }
      }
    } catch (error) {
      console.error('Error during onboarding completion:', error);
      Alert.alert(
        "Error",
        error.message || "There was a problem completing your account setup. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle logo image selection
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      updateForm('businessLogo', result.assets[0].uri);
    }
  };

  // Add a header with a back arrow for steps 2 and 3
  const renderHeader = () => (
    <View style={styles.headerRow}>
      {currentStep > 1 && (
        <TouchableOpacity
          style={styles.headerBackArrow}
          onPress={() => setCurrentStep(currentStep - 1)}
        >
          <MaterialIcons name="arrow-back" size={28} color="#1F2937" />
        </TouchableOpacity>
      )}
      <Text style={styles.headerTitle}>QuickQuote Setup</Text>
    </View>
  );

  // Render progress bar
  const renderProgressBar = () => (
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View 
            style={[
              styles.progressFill, 
            { width: `${(currentStep / 3) * 100}%` }
            ]} 
          />
        </View>
        <View style={styles.stepsContainer}>
        {[1, 2, 3].map(step => (
            <View 
              key={step} 
              style={[
                styles.stepCircle,
              currentStep === step ? styles.activeStep : {},
              currentStep > step ? styles.completedStep : {},
              ]}
            >
            {currentStep > step ? (
              <MaterialIcons name="check" size={18} color="#fff" />
            ) : (
              <Text style={styles.stepText}>{step}</Text>
            )}
            </View>
          ))}
        </View>
      </View>
    );

  // Render Step 1: Personal Details
  const renderStep1 = () => (
    <View style={styles.card}>
      <Text style={styles.stepTitle}>Personal Details</Text>
        <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.textInput}
            value={formValues.fullName}
            onChangeText={text => updateForm('fullName', text)}
                  placeholder="Enter your full name"
                />
              </View>
          <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.textInput}
              value={formValues.email}
            onChangeText={text => updateForm('email', text)}
              placeholder="Enter your email address"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.textInput}
              value={formValues.password}
              onChangeText={text => updateForm('password', text)}
              placeholder="Enter your password"
              secureTextEntry={true}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <TextInput
              style={styles.textInput}
              value={formValues.confirmPassword}
              onChangeText={text => updateForm('confirmPassword', text)}
              placeholder="Re-enter your password"
              secureTextEntry={true}
            />
          </View>
      </View>
      <TouchableOpacity onPress={nextStep} style={styles.nextButton}>
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Back to Sign In</Text>
      </TouchableOpacity>
    </View>
  );

  // Render Step 2: Business Details
  const renderStep2 = () => (
    <View style={styles.card}>
      <Text style={styles.stepTitle}>Business Details</Text>
      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Business Name</Text>
          <TextInput
            style={styles.textInput}
            value={formValues.businessName}
            onChangeText={text => updateForm('businessName', text)}
            placeholder="Enter your business name"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Business Address</Text>
          <TextInput
            style={styles.textInput}
            value={formValues.businessAddress}
            onChangeText={text => updateForm('businessAddress', text)}
            placeholder="Enter your business address"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Business Phone</Text>
          <TextInput
            style={styles.textInput}
            value={formValues.businessPhone}
            onChangeText={text => updateForm('businessPhone', text)}
            placeholder="Enter your business phone"
            keyboardType="phone-pad"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Business Email</Text>
          <TextInput
            style={styles.textInput}
            value={formValues.businessEmail}
            onChangeText={text => updateForm('businessEmail', text)}
            placeholder="Enter your business email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Business Logo</Text>
          {!formValues.businessLogo ? (
            <TouchableOpacity style={styles.logoDropBox} onPress={pickImage}>
              <MaterialIcons name="add-photo-alternate" size={36} color="#3B82F6" />
              <Text style={styles.logoDropBoxText}>Click to upload logo</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.logoPreviewContainer}>
              <Image source={{ uri: formValues.businessLogo }} style={styles.logoPreview} />
              <TouchableOpacity style={styles.changeLogoButton} onPress={pickImage}>
                <Text style={styles.changeLogoText}>Change</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity onPress={() => setCurrentStep(3)} style={styles.nextButton}>
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  // Render Step 3: Banking Details for Paystack
  const renderStep3 = () => (
    <View style={styles.card}>
      <Text style={styles.stepTitle}>Payment Setup</Text>
      <Text style={styles.infoText}>
        To receive payments through WhatsApp links, we need your bank account details to register you as a sub-account.
      </Text>
      
      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Bank Name</Text>
          <TextInput
            style={styles.textInput}
            value={formValues.bankName}
            onChangeText={text => updateForm('bankName', text)}
            placeholder="Enter your bank name"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Account Number</Text>
          <TextInput
            style={styles.textInput}
            value={formValues.accountNumber}
            onChangeText={text => updateForm('accountNumber', text)}
            placeholder="Enter your account number"
            keyboardType="numeric"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Account Name</Text>
          <TextInput
            style={styles.textInput}
            value={formValues.accountName}
            onChangeText={text => updateForm('accountName', text)}
            placeholder="Enter account holder name"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>BVN (Bank Verification Number)</Text>
          <TextInput
            style={styles.textInput}
            value={formValues.bvn}
            onChangeText={text => updateForm('bvn', text)}
            placeholder="Enter your BVN"
            keyboardType="numeric"
            secureTextEntry={true}
          />
          <Text style={styles.helperText}>
            Your BVN is required by Paystack for KYC purposes. It will be securely stored.
          </Text>
        </View>
        
        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={[
              styles.checkbox,
              formValues.acceptPaystackTerms && styles.checkboxChecked
            ]}
            onPress={() => 
              updateForm('acceptPaystackTerms', !formValues.acceptPaystackTerms)
            }
          >
            {formValues.acceptPaystackTerms && (
              <MaterialIcons name="check" size={16} color="#FFF" />
            )}
          </TouchableOpacity>
          <Text style={styles.checkboxLabel}>
            I agree to Paystack's terms and conditions for sub-accounts
          </Text>
        </View>
      </View>
      
      <TouchableOpacity 
        onPress={handleFinish} 
        style={[
          styles.nextButton,
          (!formValues.bankName || 
           !formValues.accountNumber || 
           !formValues.accountName || 
           !formValues.bvn || 
           !formValues.acceptPaystackTerms) && styles.disabledButton
        ]}
        disabled={
          !formValues.bankName || 
          !formValues.accountNumber || 
          !formValues.accountName || 
          !formValues.bvn || 
          !formValues.acceptPaystackTerms
        }
      >
        <Text style={styles.nextButtonText}>Finish</Text>
      </TouchableOpacity>
    </View>
  );

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {renderHeader()}
          {renderProgressBar()}
          {renderCurrentStep()}
        </ScrollView>
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
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerBackArrow: {
    marginRight: 10,
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 30,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 10,
  },
  progressFill: {
    height: 6,
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStep: {
    backgroundColor: '#3B82F6',
  },
  stepText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  optionButton: {
    width: '45%',
    backgroundColor: '#EFF6FF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  optionEmoji: {
    fontSize: 36,
    marginBottom: 10,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  formContainer: {
    marginTop: 10,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    fontSize: 16,
  },
  logoContainer: {
    marginTop: 5,
  },
  uploadButton: {
    height: 100,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    marginTop: 8,
    fontSize: 14,
    color: '#4B5563',
  },
  logoPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  changeLogoButton: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
  },
  changeLogoText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
  completedStep: {
    backgroundColor: '#10B981',
  },
  logoDropBox: {
    height: 100,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  logoDropBoxText: {
    color: '#3B82F6',
    fontSize: 15,
    marginTop: 8,
  },
  infoText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  helperText: {
    fontSize: 14,
    color: '#6B7280',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
  },
  checkboxLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4B5563',
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
  },
});

export default OnboardingScreen; 