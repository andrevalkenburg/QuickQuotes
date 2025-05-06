import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const BottomNavBar = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'report', label: 'Report', icon: 'bar-chart' },
    { id: 'team', label: 'Team', icon: 'group' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];

  return (
    <View style={styles.container}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab.id}
          style={[
            styles.tabButton,
            activeTab === tab.id && styles.activeTabButton
          ]}
          onPress={() => {
            console.log("Tab pressed:", tab.id);
            onTabChange(tab.id);
          }}
        >
          <MaterialIcons
            name={tab.icon}
            size={24}
            color={activeTab === tab.id ? '#3B82F6' : '#6B7280'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === tab.id && styles.activeTabLabel
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB', // gray-200
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTabButton: {
    borderTopWidth: 2,
    borderTopColor: '#3B82F6', // blue-500
  },
  tabLabel: {
    fontSize: 12,
    color: '#6B7280', // gray-500
    marginTop: 4,
  },
  activeTabLabel: {
    color: '#3B82F6', // blue-500
    fontWeight: '500',
  },
});

export default BottomNavBar; 