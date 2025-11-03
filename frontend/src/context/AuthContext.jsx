import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { authService } from '../services/authService.js';

export const AuthContext = createContext({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  register: async () => {}
});

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  const persistSession = (sessionToken, sessionUser) => {
    if (sessionToken) {
      localStorage.setItem('token', sessionToken);
    }
    if (sessionUser) {
      localStorage.setItem('user', JSON.stringify(sessionUser));
    }
  };

  const clearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const initialize = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await authService.verifyToken();
      if (response?.valid) {
        setUser(response.user);
        persistSession(token, response.user);
      } else {
        clearSession();
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      clearSession();
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const login = useCallback(async (credentials) => {
    const response = await authService.login(credentials);
    setToken(response.token);
    setUser(response.user);
    persistSession(response.token, response.user);
    toast.success('Login successful');
    return response;
  }, []);

  const register = useCallback(async (payload) => {
    const response = await authService.register(payload);
    toast.success('Registration successful, please login');
    return response;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      // Even if the API call fails, clear the local session
      console.error('Logout request failed, clearing session locally', error);
    } finally {
      clearSession();
      setToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({
    token,
    user,
    loading,
    login,
    logout,
    register
  }), [token, user, loading, login, logout, register]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
