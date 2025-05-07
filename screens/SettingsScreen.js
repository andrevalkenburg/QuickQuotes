import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  SafeAreaView 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../utils/AuthContext';

// Storage key for quotes (must match the one in DashboardScreen)
const QUOTES_STORAGE_KEY = 'quickquote_data';

const SettingsScreen = ({ navigation }) => {
  const { signOut } = useAuth();

  // Handle logout
  const handleLogout = async () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Log Out",
          onPress: async () => {
            try {
              // Clear sensitive user data from AsyncStorage
              const keysToRemove = [
                'userInfo',
                'payFastInfo'
                // Add any other sensitive keys that should be cleared on logout
              ];
              
              // We don't clear the quotes data to preserve the user's work
              await AsyncStorage.multiRemove(keysToRemove);
              
              // Sign out using AuthContext
              await signOut();
              
              // Navigate back to sign in screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error("Error signing out:", error);
              Alert.alert("Error", "There was a problem logging out. Please try again.");
            }
          }
        }
      ]
    );
  };

  // Handle resetting all data
  const handleResetData = () => {
    Alert.alert(
      "Reset All Data",
      "Are you sure you want to delete all quotes? This cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Reset Data",
          style: "destructive",
          onPress: resetAllData
        }
      ]
    );
  };

  // Function to reset all data
  const resetAllData = async () => {
    try {
      // Create empty data structure
      const emptyData = {
        Draft: [],
        Sent: [],
        Accepted: [],
        'Scheduled Work': [],
        Complete: [],
      };
      
      // Save empty data to storage
      await AsyncStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(emptyData));
      
      // Show success message
      Alert.alert(
        "Success",
        "All quotes have been deleted.",
        [{ text: "OK" }]
      );
      
      console.log("All data reset successfully");
    } catch (error) {
      console.error("Error resetting data:", error);
      
      // Show error message
      Alert.alert(
        "Error",
        "There was a problem resetting your data. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader subtitle="Settings" />
      
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <MaterialIcons name="logout" size={24} color="#fff" />
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
        
        <View style={[styles.section, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity 
            style={styles.resetButton}
            onPress={handleResetData}
          >
            <MaterialIcons name="delete-forever" size={24} color="#fff" />
            <Text style={styles.resetButtonText}>Reset All Data</Text>
          </TouchableOpacity>
          
          <Text style={styles.infoText}>
            This will delete all quotes from your dashboard. This action cannot be undone.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
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
  logoutButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  resetButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  resetButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  }
});

export default SettingsScreen; 