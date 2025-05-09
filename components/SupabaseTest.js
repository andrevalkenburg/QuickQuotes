import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Modal } from 'react-native';
import supabase from '../utils/supabaseClient';
import * as Network from 'expo-network';
import networkTest from '../utils/networkTest';

const SupabaseTest = () => {
  const [connectionStatus, setConnectionStatus] = useState('Checking connection...');
  const [error, setError] = useState(null);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [visible, setVisible] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const addTestResult = (testName, result, details = null) => {
    setTestResults(prev => [...prev, { testName, result, details, time: new Date().toISOString() }]);
  };

  const testConnection = async () => {
    setConnectionStatus('Checking connection...');
    setError(null);
    setIsRetrying(true);
    setTestResults([]);
    
    try {
      // Run the comprehensive test
      const results = await networkTest.runComprehensiveTest();
      
      if (!results.networkConnectivity) {
        throw new Error('Device is not connected to the internet');
      }
      
      if (!results.googleConnectivity?.success) {
        throw new Error('Cannot reach the internet. Check your connection.');
      }
      
      if (!results.supabaseConnectivity?.success) {
        throw new Error(`Cannot reach Supabase domain at ${supabase.supabaseUrl}`);
      }
      
      // If we get here, basic connectivity is working
      
      // Try actual Supabase API with authentication
      try {
        const response = await fetch(`${supabase.supabaseUrl}/rest/v1/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabase.supabaseKey,
          },
        });
        
        if (response.ok) {
          setConnectionStatus('Connected to Supabase successfully!');
        } else {
          throw new Error(`API responded with status: ${response.status}`);
        }
      } catch (err) {
        throw err;
      }
    } catch (err) {
      setError(err.message);
      setConnectionStatus('Failed to connect to Supabase');
      console.error('Supabase connection error:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  // Auto-dismiss after successful connection
  useEffect(() => {
    if (connectionStatus.includes('success')) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [connectionStatus]);

  // Don't render anything if not visible
  if (!visible) {
    return null;
  }

  // Compact mode just shows status and dismiss button
  if (!expanded) {
    return (
      <View style={styles.miniContainer}>
        <View style={styles.miniContent}>
          <Text style={[
            styles.miniStatus, 
            connectionStatus.includes('success') ? styles.success : 
            connectionStatus.includes('Failed') ? styles.error : styles.checking
          ]}>
            {connectionStatus.includes('success') ? '✓' : 
             connectionStatus.includes('Failed') ? '✗' : '⟳'} Supabase
          </Text>
          
          <View style={styles.miniActions}>
            {isRetrying ? (
              <ActivityIndicator color="#3B82F6" size="small" />
            ) : (
              <>
                <TouchableOpacity onPress={() => setExpanded(true)} style={styles.miniButton}>
                  <Text style={styles.miniButtonText}>Details</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setVisible(false)} style={[styles.miniButton, styles.dismissButton]}>
                  <Text style={styles.miniButtonText}>Dismiss</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    );
  }

  // Full expanded mode
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Supabase Connection Test</Text>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setExpanded(false)}
            >
              <Text style={styles.closeButtonText}>Minimize</Text>
            </TouchableOpacity>
          </View>

          <Text style={[
            styles.status, 
            connectionStatus.includes('success') ? styles.success : 
            connectionStatus.includes('Failed') ? styles.error : styles.checking
          ]}>
            {connectionStatus}
          </Text>
          {error && <Text style={styles.errorDetails}>{error}</Text>}
          
          {isRetrying ? (
            <ActivityIndicator color="#3B82F6" size="large" style={styles.loader} />
          ) : (
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={testConnection}
                disabled={isRetrying}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.retryButton, styles.dismissButton]} 
                onPress={() => setVisible(false)}
              >
                <Text style={styles.retryText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>Connection Details:</Text>
            <Text style={styles.infoText}>URL: {supabase.supabaseUrl}</Text>
            <Text style={styles.infoText}>Key: {supabase.supabaseKey.substring(0, 10)}...</Text>
            <Text style={styles.infoText}>Platform: {Platform.OS} {Platform.Version}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Mini mode styles
  miniContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  miniContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniStatus: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  miniActions: {
    flexDirection: 'row',
  },
  miniButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#3B82F6',
    borderRadius: 4,
    marginLeft: 8,
  },
  miniButtonText: {
    color: 'white',
    fontSize: 12,
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  closeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  closeButtonText: {
    color: '#4b5563',
    fontSize: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 16,
    marginBottom: 10,
  },
  success: {
    color: 'green',
  },
  error: {
    color: 'red',
  },
  checking: {
    color: 'orange',
  },
  errorDetails: {
    color: 'red',
    fontSize: 14,
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  retryButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  dismissButton: {
    backgroundColor: '#ef4444',
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
  },
  loader: {
    marginTop: 15,
    marginBottom: 15,
  },
  infoContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
  },
  infoTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: 4,
  },
});

export default SupabaseTest; 