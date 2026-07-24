/**
 * Expo entry point for mobile deployment
 * Wraps the existing web app with Expo-specific configuration
 */
import React from 'react';
import { SafeAreaView, Platform } from 'react-native';
import App from './App';

export default function ExpoApp() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1a1a2e' }}>
      <App />
    </SafeAreaView>
  );
}
