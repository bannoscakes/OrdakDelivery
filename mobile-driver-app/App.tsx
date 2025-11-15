import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from '@/navigation/AppNavigator';
import { useAuthStore } from '@/store/auth.store';

const App: React.FC = () => {
  const { isAuthenticated, loadStoredAuth } = useAuthStore();

  useEffect(() => {
    // Load stored authentication on app start
    loadStoredAuth();
  }, [loadStoredAuth]);

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#2196F3"
        translucent={false}
      />
      <AppNavigator isAuthenticated={isAuthenticated} />
    </SafeAreaProvider>
  );
};

export default App;
