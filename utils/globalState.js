/**
 * Simple global state for the application
 * This allows us to access business information across different screens
 * without using a full state management library
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Global state object
const globalState = {
  // Business information
  businessName: '',
  businessLogo: null,
  businessAddress: '',
  businessPhone: '',
  businessEmail: '',
  
  // Initialize state from AsyncStorage
  async init() {
    try {
      // Load business info
      const businessInfo = await AsyncStorage.getItem('businessInfo');
      if (businessInfo) {
        const parsedInfo = JSON.parse(businessInfo);
        this.businessName = parsedInfo.businessName || '';
        this.businessLogo = parsedInfo.businessLogo || null;
        this.businessAddress = parsedInfo.businessAddress || '';
        this.businessPhone = parsedInfo.businessPhone || '';
        this.businessEmail = parsedInfo.businessEmail || '';
      }
      return true;
    } catch (error) {
      console.error('Error initializing global state:', error);
      return false;
    }
  },
  
  // Update business information
  async updateBusinessInfo(info) {
    try {
      // Update state
      this.businessName = info.businessName || this.businessName;
      this.businessLogo = info.businessLogo || this.businessLogo;
      this.businessAddress = info.businessAddress || this.businessAddress;
      this.businessPhone = info.businessPhone || this.businessPhone;
      this.businessEmail = info.businessEmail || this.businessEmail;
      
      // Save to AsyncStorage
      const businessInfo = {
        businessName: this.businessName,
        businessLogo: this.businessLogo,
        businessAddress: this.businessAddress,
        businessPhone: this.businessPhone,
        businessEmail: this.businessEmail
      };
      
      await AsyncStorage.setItem('businessInfo', JSON.stringify(businessInfo));
      return true;
    } catch (error) {
      console.error('Error updating business info:', error);
      return false;
    }
  }
};

export default globalState; 