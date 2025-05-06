import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { useAuth } from '../utils/AuthContext';

const SignInScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithMagicLink } = useAuth();

  const handleSendMagicLink = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await signInWithMagicLink(email);
      
      // For demo purposes, navigate directly to Main instead of waiting for link
      Alert.alert(
        'Success!',
        'For demo purposes, you will be logged in directly.',
        [{ 
          text: 'OK',
          onPress: () => navigation.navigate('Main')
        }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    // Navigate to onboarding
    navigation.navigate('Onboarding');
  };

  const switchToPasswordLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Text style={styles.title}>QuickQuote</Text>
          <Text style={styles.subtitle}>Sign in with Magic Link</Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            disabled={loading}
            mode="outlined"
            outlineColor="#D1D5DB"
            activeOutlineColor="#3B82F6"
          />

          <Button
            mode="contained"
            onPress={handleSendMagicLink}
            loading={loading}
            style={styles.button}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </Button>

          <TouchableOpacity
            onPress={switchToPasswordLogin}
            style={styles.switchAuthContainer}
            disabled={loading}
          >
            <Text style={styles.switchAuthText}>
              Sign in with Password
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSignUp}
            style={styles.signUpContainer}
            disabled={loading}
          >
            <Text style={styles.signUpText}>
              Don't have an account? <Text style={styles.signUpLink}>Sign up</Text>
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
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 8,
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 16,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
  },
  switchAuthContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchAuthText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '500',
  },
  signUpContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  signUpText: {
    color: '#6B7280',
    fontSize: 16,
  },
  signUpLink: {
    color: '#3B82F6',
    fontWeight: '600',
  },
});

export default SignInScreen; 