import React, { useState, createContext, useContext, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider, useAuth } from './utils/AuthContext';
import DashboardScreen from './screens/DashboardScreen';
import QuoteFormScreen from './screens/QuoteFormScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import LoginScreen from './screens/LoginScreen';
import ReportsScreen from './screens/ReportsScreen';
import SettingsScreen from './screens/SettingsScreen';
import TeamScreen from './screens/TeamScreen';
import TeamJoinScreen from './screens/TeamJoinScreen';
import BottomNavBar from './components/BottomNavBar';
import SupabaseTest from './components/SupabaseTest';

// Create a context for app-wide connection status
export const ConnectionContext = createContext({
  showConnectionTest: false,
  setShowConnectionTest: () => {},
});

// Create stacks for main flow and nested screens
const Stack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();

// Main tabs screen with bottom navigation
const MainScreen = ({ navigation, route }) => {
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const { getUserProfile } = useAuth();
  const [userRole, setUserRole] = useState('team_member'); // Default to most restrictive role
  
  // Get user role on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userProfile = await getUserProfile();
        if (userProfile && userProfile.role) {
          setUserRole(userProfile.role);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    
    fetchUserProfile();
  }, []);
  
  // Set the active screen, but restrict access for team members
  const handleTabChange = (screenId) => {
    // If trying to access a restricted screen as a team member, stay on dashboard
    if (userRole !== 'owner' && (screenId === 'report' || screenId === 'team')) {
      console.log('Access denied: Team members cannot access', screenId);
      return;
    }
    
    setActiveScreen(screenId);
  };

  // Pass any parameters from Main to the DashboardScreen
  const dashboardParams = route.params || {};

  const renderScreen = () => {
    console.log("Current active screen:", activeScreen);
    switch (activeScreen) {
      case 'dashboard':
        return <DashboardScreen navigation={navigation} route={{...route, params: dashboardParams}} />;
      case 'report':
        console.log("Rendering ReportsScreen");
        return <ReportsScreen navigation={navigation} />;
      case 'team':
        return <TeamScreen navigation={navigation} />;
      case 'settings':
        return <SettingsScreen navigation={navigation} />;
      default:
        return <DashboardScreen navigation={navigation} route={{...route, params: dashboardParams}} />;
    }
  };

  return (
    <View style={styles.container}>
      {renderScreen()}
      <BottomNavBar 
        activeTab={activeScreen} 
        onTabChange={handleTabChange} 
      />
    </View>
  );
};

// Regular login screen without forced connection test
const LoginScreenWithOptionalTest = (props) => {
  // Access the connection context
  const { showConnectionTest } = useContext(ConnectionContext);

  return (
    <View style={{ flex: 1 }}>
      <LoginScreen {...props} />
      {showConnectionTest && <SupabaseTest />}
    </View>
  );
};

export default function App() {
  // State to determine if we should show the connection test
  const [showConnectionTest, setShowConnectionTest] = useState(false);

  // Connection context value
  const connectionContextValue = {
    showConnectionTest,
    setShowConnectionTest,
  };

  return (
    <ConnectionContext.Provider value={connectionContextValue}>
    <AuthProvider>
      <PaperProvider>
        <SafeAreaProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <Stack.Navigator initialRouteName="Login">
              <Stack.Screen 
                name="Login" 
                  component={LoginScreenWithOptionalTest} 
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="TeamJoin" 
                component={TeamJoinScreen} 
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="Onboarding" 
                component={OnboardingScreen} 
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="Main" 
                component={MainScreen} 
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="QuoteForm" 
                component={QuoteFormScreen} 
                options={{ 
                  title: "Quote Details",
                  headerStyle: {
                    backgroundColor: '#2563EB',
                  },
                  headerTintColor: '#fff',
                  headerShown: true,
                  // Don't show the default back button since we have our custom one
                  headerLeft: () => null
                }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </PaperProvider>
    </AuthProvider>
    </ConnectionContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB', // gray-50
  }
});
