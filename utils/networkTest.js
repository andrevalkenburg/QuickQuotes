import * as Network from 'expo-network';

// Function to test general network connectivity
export const testNetworkConnectivity = async () => {
  try {
    console.log('Testing general network connectivity...');
    
    // Check device network status
    const networkState = await Network.getNetworkStateAsync();
    console.log('Network state:', networkState);
    
    if (!networkState.isConnected) {
      console.log('Device is not connected to any network');
      return false;
    }
    
    if (!networkState.isInternetReachable) {
      console.log('Internet is not reachable');
      return false;
    }
    
    console.log('Basic network connectivity check passed');
    return true;
  } catch (error) {
    console.error('Error testing network connectivity:', error);
    return false;
  }
};

// Function to test connectivity to a specific URL
export const testUrlConnectivity = async (url, options = {}) => {
  try {
    console.log(`Testing connectivity to ${url}...`);
    
    const fetchOptions = {
      method: 'HEAD',
      ...options
    };
    
    // Attempt to fetch the URL
    const response = await fetch(url, fetchOptions);
    console.log(`Response from ${url}:`, response.status);
    
    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    console.error(`Error connecting to ${url}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Function to perform a comprehensive connectivity test
export const runComprehensiveTest = async () => {
  const results = {
    networkConnectivity: null,
    googleConnectivity: null,
    supabaseConnectivity: null
  };
  
  // Test basic network connectivity
  results.networkConnectivity = await testNetworkConnectivity();
  
  if (!results.networkConnectivity) {
    return results;
  }
  
  // Test connectivity to Google (as a general internet test)
  results.googleConnectivity = await testUrlConnectivity('https://www.google.com');
  
  // Test connectivity to Supabase
  results.supabaseConnectivity = await testUrlConnectivity('https://yuellorvkmdgoxkbljhd.supabase.co');
  
  return results;
};

// Export default object for easy import
export default {
  testNetworkConnectivity,
  testUrlConnectivity,
  runComprehensiveTest
}; 