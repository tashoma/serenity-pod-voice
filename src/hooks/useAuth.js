import { useState, useEffect } from 'react';
import { onAuthChange, loginWithEmail, registerWithEmail, logoutUser } from '../services/firebase';

/**
 * Custom hook for handling Firebase authentication
 * @returns {Object} Authentication state and handlers
 */
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Check authentication state on mount
  useEffect(() => {
    const unsubscribe = onAuthChange((currentUser) => {
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  /**
   * Login with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User credential
   */
  const login = async (email, password) => {
    try {
      setError(null);
      setIsLoading(true);
      const userCredential = await loginWithEmail(email, password);
      return userCredential;
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Register with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User credential
   */
  const register = async (email, password) => {
    try {
      setError(null);
      setIsLoading(true);
      const userCredential = await registerWithEmail(email, password);
      return userCredential;
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Logout the current user
   * @returns {Promise<boolean>} Success status
   */
  const logout = async () => {
    try {
      setError(null);
      setIsLoading(true);
      await logoutUser();
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      setError(error.message || 'Logout failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout
  };
};

export default useAuth; 