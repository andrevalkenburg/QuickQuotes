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
  const { signUp } = useAuth();
  
  // Form values
  const [formValues, setFormValues] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    businessName: '',
    businessAddress: '',
    businessPhone: '',
    businessEmail: '',
    businessLogo: null,
    isPaystackMerchant: null,
    paystackMerchantId: '',
    paystackMerchantKey: ''
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
      if (!formValues.email) {
        Alert.alert('Error', 'Email address is required');
        return;
      }
      
      if (formValues.password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return;
      }
      
      // Create local account without Supabase
      setLoading(true);
      try {
        // Use the mocked signUp function
        await signUp(formValues.email, formValues.password);
        
        // Move to next step
        setCurrentStep(prev => prev + 1);
      } catch (error) {
        Alert.alert('Error', 'Failed to create account. Please try again.');
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

  // Handle finish (submit or navigate to dashboard)
  const handleFinish = async () => {
    console.log('Onboarding complete!', formValues);
    
    // Save to global state and AsyncStorage
    await globalState.updateBusinessInfo({
      businessName: formValues.businessName,
      businessLogo: formValues.businessLogo,
      businessAddress: formValues.businessAddress,
      businessPhone: formValues.businessPhone,
      businessEmail: formValues.businessEmail
    });
    
    // Save user info separately
    await AsyncStorage.setItem('userInfo', JSON.stringify({
      name: formValues.fullName,
      phoneNumber: formValues.phoneNumber,
      email: formValues.email
    }));
    
    // Save PayFast info if it was set up
    if (formValues.setupPayFast) {
      await AsyncStorage.setItem('payFastInfo', JSON.stringify({
        merchantId: formValues.merchantId,
        merchantKey: formValues.merchantKey
      }));
    }
    
    // Navigate to dashboard
    if (navigation) {
      navigation.navigate('Main');
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
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.textInput}
              value={formValues.phoneNumber}
            onChangeText={text => updateForm('phoneNumber', text)}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
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
      </View>
      <TouchableOpacity onPress={() => setCurrentStep(2)} style={styles.nextButton}>
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('SignIn')} style={styles.secondaryButton}>
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

  // Render Step 3: Paystack Registration
  const renderStep3 = () => (
    <View style={styles.card}>
      <Text style={styles.stepTitle}>Paystack Registration</Text>
      <Text style={styles.questionText}>Are you a registered Paystack merchant?</Text>
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[styles.optionButton, formValues.isPaystackMerchant === true && styles.activeStep]}
          onPress={() => updateForm('isPaystackMerchant', true)}
        >
          <Text style={styles.optionText}>Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.optionButton, formValues.isPaystackMerchant === false && styles.activeStep]}
          onPress={() => updateForm('isPaystackMerchant', false)}
        >
          <Text style={styles.optionText}>No</Text>
        </TouchableOpacity>
      </View>
      {formValues.isPaystackMerchant === true && (
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Paystack Merchant ID</Text>
            <TextInput
              style={styles.textInput}
              value={formValues.paystackMerchantId}
              onChangeText={text => updateForm('paystackMerchantId', text)}
              placeholder="Enter your Paystack Merchant ID"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Paystack Merchant Key</Text>
            <TextInput
              style={styles.textInput}
              value={formValues.paystackMerchantKey}
              onChangeText={text => updateForm('paystackMerchantKey', text)}
              placeholder="Enter your Paystack Merchant Key"
            />
          </View>
                </View>
      )}
      {formValues.isPaystackMerchant === false && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ color: '#1F2937', fontSize: 16, marginBottom: 8 }}>Not registered?</Text>
          <TouchableOpacity onPress={() => {}}>
            <Text style={{ color: '#3B82F6', textDecorationLine: 'underline' }}>Register for Paystack</Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity onPress={handleFinish} style={styles.nextButton}>
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
  logoPreviewContainer: {
    alignItems: 'center',
  },
  changeLogoButton: {
    marginTop: 8,
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  changeLogoText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default OnboardingScreen; 