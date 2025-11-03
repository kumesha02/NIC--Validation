import api from './api.js';

export const reportService = {
  generateReport: async (payload) => {
    const { data } = await api.post('/reports/generate', payload);
    return data;
  },
  listReports: async () => {
    const { data } = await api.get('/reports/list');
    return data;
  },
  downloadReport: async (id) => {
    const response = await api.get(`/reports/download/${id}`, {
      responseType: 'blob'
    });
    const disposition = response.headers['content-disposition'];
    let filename = `report-${id}`;
    if (disposition) {
      const match = disposition.match(/filename="(.+)"/);
      if (match?.[1]) {
        filename = match[1];
      }
    }
    return { data: response.data, filename };
  },
  deleteReport: async (id) => {
    const { data } = await api.delete(`/reports/${id}`);
    return data;
  }
};
