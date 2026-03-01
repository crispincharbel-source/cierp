import React, { createContext, useState, useEffect, useContext } from 'react';
import { getProfile } from '../api/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadUser = async () => {

    if (user) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const { user } = await getProfile();
        setUser(user);
      }
    } catch (err) {
      console.error('Error loading user:', err);
      setError('Failed to load user data');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  // Load user on initial render if token exists
  useEffect(() => {
    loadUser();
  }, []);

  const loginUser = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logoutUser = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser((prevUser) => ({
      ...prevUser,
      ...updatedUser,
    }));
    localStorage.setItem('user', JSON.stringify({
      ...user,
      ...updatedUser,
    }));
  };

  const value = {
    user,
    loading,
    error,
    loginUser,
    logoutUser,
    updateUser,
    loadUser,
    isAdmin: user?.id_role === 1,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};