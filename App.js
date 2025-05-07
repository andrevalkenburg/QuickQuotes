import React, { useState, createContext, useContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from './utils/AuthContext';
import DashboardScreen from './screens/DashboardScreen';
import QuoteFormScreen from './screens/QuoteFormScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import LoginScreen from './screens/LoginScreen';
import ReportsScreen from './screens/ReportsScreen';
import SettingsScreen from './screens/SettingsScreen';
import TeamScreen from './screens/TeamScreen';
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
        onTabChange={setActiveScreen} 
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
