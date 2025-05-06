import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

const TabSelector = ({ activeTab, setActiveTab, tabs }) => {
  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.scrollView}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tabButton,
              activeTab === tab && styles.activeTabButton
            ]}
          >
            <Text 
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
  },
  scrollView: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB', // gray-200
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6', // blue-500
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4B5563', // gray-600
  },
  activeTabText: {
    color: '#3B82F6', // blue-500
  },
});

export default TabSelector; 