/**
 * PaystackService.js
 * Handles all interactions with the Paystack API
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
const PAYSTACK_API_BASE = 'https://api.paystack.co';
const PAYSTACK_API_KEY = 'your_secret_key_here'; // This should be securely stored or fetched from a backend

// In a production app, these API calls should be made through your backend
// to avoid exposing your secret key in the client-side code

/**
 * Creates a sub-account on Paystack
 * @param {Object} businessData - Business and banking details
 * @returns {Promise} - Response from Paystack API
 */
export const createSubAccount = async (businessData) => {
  try {
    // In a real implementation, this should be a call to your backend API
    // which then makes the Paystack API call with your secret key
    
    // Example implementation if calling directly (not recommended for production)
    const response = await fetch(`${PAYSTACK_API_BASE}/subaccount`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        business_name: businessData.businessName,
        settlement_bank: businessData.bankName,
        account_number: businessData.accountNumber,
        percentage_charge: 20, // 20% to platform, 80% to sub-account
        description: `Sub-account for ${businessData.businessName}`,
        primary_contact_email: businessData.businessEmail,
        primary_contact_name: businessData.accountName,
        primary_contact_phone: businessData.businessPhone,
        metadata: {
          bvn: businessData.bvn,
          business_address: businessData.businessAddress
        }
      })
    });
    
    const data = await response.json();
    
    // Save sub-account info in AsyncStorage
    if (data.status) {
      await AsyncStorage.setItem('paystackSubaccount', JSON.stringify(data.data));
    }
    
    return data;
  } catch (error) {
    console.error('Error creating Paystack sub-account:', error);
    throw error;
  }
};

/**
 * Generates a WhatsApp payment link via Paystack
 * @param {Object} quoteData - Quote details including amount, customer info
 * @returns {Promise} - Response containing payment link
 */
export const generateWhatsAppPaymentLink = async (quoteData) => {
  try {
    // Get sub-account info from storage
    const subaccountData = await AsyncStorage.getItem('paystackSubaccount');
    const subaccount = JSON.parse(subaccountData);
    
    // In a real implementation, this should be a call to your backend API
    const response = await fetch(`${PAYSTACK_API_BASE}/transaction/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: quoteData.amount * 100, // Paystack amount is in kobo (cents)
        email: quoteData.customerEmail,
        reference: `QUOTE_${quoteData.id}_${Date.now()}`,
        subaccount: subaccount.subaccount_code,
        channels: ['whatsapp'],
        metadata: {
          quote_id: quoteData.id,
          customer_name: quoteData.customerName,
          customer_phone: quoteData.customerPhone
        }
      })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error generating WhatsApp payment link:', error);
    throw error;
  }
};

/**
 * Verifies a payment transaction
 * @param {string} reference - Transaction reference
 * @returns {Promise} - Response from Paystack API
 */
export const verifyTransaction = async (reference) => {
  try {
    const response = await fetch(`${PAYSTACK_API_BASE}/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error verifying Paystack transaction:', error);
    throw error;
  }
};

export default {
  createSubAccount,
  generateWhatsAppPaymentLink,
  verifyTransaction
}; 