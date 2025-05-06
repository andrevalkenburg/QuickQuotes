import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../utils/AuthContext';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      // Use mock sign in
      await signIn(email, password);
      
      // Navigate to main screen
      navigation.navigate('Main');
    } catch (error) {
      Alert.alert('Authentication Error', 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    // Navigate to onboarding for signup
    navigation.navigate('Onboarding');
  };

  const switchToMagicLink = () => {
    navigation.navigate('SignIn');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Text style={styles.title}>QuickQuote</Text>
          <Text style={styles.subtitle}>Login to your account</Text>
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
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            disabled={loading}
            mode="outlined"
            outlineColor="#D1D5DB"
            activeOutlineColor="#3B82F6"
          />

          <Button
            mode="contained"
            onPress={handleSignIn}
            loading={loading}
            style={styles.button}
            disabled={loading}
          >
            Login
          </Button>

          <TouchableOpacity
            onPress={switchToMagicLink}
            style={styles.switchAuthContainer}
            disabled={loading}
          >
            <Text style={styles.switchAuthText}>
              Sign in with Magic Link
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

export default LoginScreen; 