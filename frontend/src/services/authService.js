import api from './api.js';

export const authService = {
  login: async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    return data;
  },
  register: async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    return data;
  },
  forgotPassword: async (payload) => {
    const { data } = await api.post('/auth/forgot-password', payload);
    return data;
  },
  resetPassword: async (payload) => {
    const { data } = await api.post('/auth/reset-password', payload);
    return data;
  },
  verifyToken: async () => {
    const { data } = await api.get('/auth/verify');
    return data;
  },
  logout: async () => {
    await api.post('/auth/logout');
  }
};
