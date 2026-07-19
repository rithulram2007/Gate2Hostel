import React, { createContext, useState, useEffect, useCallback } from 'react';
import { api, axiosPrivate } from '../services/api';

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to refresh access token
  const refreshAccessToken = useCallback(async () => {
    try {
      const response = await api.post('/auth/refresh', {}, { withCredentials: true });
      const { accessToken: newToken } = response.data;
      setAccessToken(newToken);

      // Fetch user profile info with private client
      const profileResponse = await axiosPrivate.get('/profile/me', {
        headers: { Authorization: `Bearer ${newToken}` }
      });
      
      setUser(profileResponse.data.user);
      return newToken;
    } catch (error) {
      setAccessToken(null);
      setUser(null);
      throw error;
    }
  }, []);

  // Check login state on initial load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await refreshAccessToken();
      } catch (error) {
        // Refresh token not found or invalid - user is not logged in
        console.log('No active session found.');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [refreshAccessToken]);

  // Login handler
  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password }, { withCredentials: true });
      const { accessToken: token, user: userData } = response.data;
      setAccessToken(token);
      setUser(userData);
      return response.data;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Google Login handler
  const loginWithGoogle = async (idToken) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/google', { idToken }, { withCredentials: true });
      const { accessToken: token, user: userData } = response.data;
      setAccessToken(token);
      setUser(userData);
      return response.data;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register handler
  const register = async (userData) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register', userData, { withCredentials: true });
      const { accessToken: token, user: newUser } = response.data;
      setAccessToken(token);
      setUser(newUser);
      return response.data;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = async () => {
    setLoading(true);
    try {
      await api.post('/auth/logout', {}, { withCredentials: true });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAccessToken(null);
      setUser(null);
      setLoading(false);
    }
  };

  // Update local user info
  const updateUserInfo = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    accessToken,
    loading,
    login,
    loginWithGoogle,
    register,
    logout,
    refreshAccessToken,
    updateUserInfo
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
