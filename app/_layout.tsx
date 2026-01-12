import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from "expo-router";
import { useEffect } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import syncManager from '../utils/syncManager';

export default function RootLayout() {
  useEffect(() => {
    // Initialize auto-sync on app start if user is logged in
    const initAutoSync = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token && !token.startsWith('offline_')) {
          console.log('🔄 Initializing auto-sync on app start');
          syncManager.setupAutoSync(token);
        }
      } catch (error) {
        console.error('Error initializing auto-sync:', error);
      }
    };
    
    initAutoSync();
  }, []);

  return (
    <ErrorBoundary>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </ErrorBoundary>
  );
}
