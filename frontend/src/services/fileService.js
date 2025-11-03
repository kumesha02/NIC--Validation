import api from './api.js';

export const fileService = {
  uploadFiles: async (files) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const { data } = await api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },
  getFiles: async () => {
    const { data } = await api.get('/files/list');
    return data;
  },
  getFileDetails: async (id) => {
    const { data } = await api.get(`/files/${id}`);
    return data;
  },
  deleteFile: async (id) => {
    const { data } = await api.delete(`/files/${id}`);
    return data;
  },
  getFileRecords: async (
    id,
    { page = 1, limit = 20, search = '', sortBy = 'id', sortOrder = 'ASC' } = {}
  ) => {
    const params = new URLSearchParams({
      page,
      limit,
      sortBy,
      sortOrder
    });

    if (search) {
      params.append('search', search);
    }

    const { data } = await api.get(`/files/${id}/records?${params.toString()}`);
    return data;
  }
};
