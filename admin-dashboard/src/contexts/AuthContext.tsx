import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { apiClient } from '../api/client';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    // Call logout endpoint to clear HttpOnly cookies
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout API call failed:', error);
    }

    setUser(null);
    setToken(null);
  }, []);

  // Setup axios interceptor for 401 handling
  useEffect(() => {
    const interceptor = apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token is invalid or expired, logout the user
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      apiClient.interceptors.response.eject(interceptor);
    };
  }, [logout]);

  // Check authentication status on mount (cookie will be sent automatically)
  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      // Cookie will be sent automatically with credentials: 'include'
      const response = await apiClient.get('/auth/me');
      setUser(response.data);
      setToken('authenticated'); // Set a dummy token value to indicate authenticated state
    } catch (error) {
      console.error('Failed to fetch user:', error);
      // Not authenticated or token expired
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Cookie will be set automatically by the backend via Set-Cookie header
      const response = await apiClient.post('/auth/login', { email, password });
      const { user: userData } = response.data;

      setUser(userData);
      setToken('authenticated'); // Set a dummy token value to indicate authenticated state
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };


  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
