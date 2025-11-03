import api from './api.js';

export const dashboardService = {
  getSummary: async () => {
    const { data } = await api.get('/dashboard/summary');
    return data;
  },
  getCharts: async () => {
    const { data } = await api.get('/dashboard/charts');
    return data;
  },
  getRecentUploads: async () => {
    const { data } = await api.get('/dashboard/recent-uploads');
    return data;
  }
};
