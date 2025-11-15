import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Screens
import LoginScreen from '@/screens/LoginScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import RunDetailsScreen from '@/screens/RunDetailsScreen';
import NavigationScreen from '@/screens/NavigationScreen';
import ProofOfDeliveryScreen from '@/screens/ProofOfDeliveryScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Bar Icons (extracted to prevent re-renders)
const HomeIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <Text style={{ fontSize: size, color }}>🏠</Text>
);

const RunsIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <Text style={{ fontSize: size, color }}>📋</Text>
);

const HistoryIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <Text style={{ fontSize: size, color }}>📊</Text>
);

const ProfileIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <Text style={{ fontSize: size, color }}>👤</Text>
);

// Main Tab Navigator (for authenticated users)
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#757575',
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: HomeIcon,
        }}
      />
      <Tab.Screen
        name="RunsList"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Runs',
          tabBarIcon: RunsIcon,
        }}
      />
      <Tab.Screen
        name="History"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: HistoryIcon,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ProfileIcon,
        }}
      />
    </Tab.Navigator>
  );
};

// Auth Navigator
const AuthNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
};

// Root Navigator
export const AppNavigator: React.FC<{ isAuthenticated: boolean }> = ({
  isAuthenticated,
}) => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen name="RunDetails" component={RunDetailsScreen} />
            <Stack.Screen
              name="Navigation"
              component={NavigationScreen}
              options={{ presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
              name="ProofOfDelivery"
              component={ProofOfDeliveryScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
