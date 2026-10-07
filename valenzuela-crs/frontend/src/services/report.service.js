import api from './api';

export const listReports = (params) => api.get('/reports', { params }).then((r) => r.data);
export const getReport = (id) => api.get(`/reports/${id}`).then((r) => r.data);
export const listCategories = () => api.get('/reports/categories').then((r) => r.data);

export const createReport = (formData, onUploadProgress) =>
  api.post('/reports', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  }).then((r) => r.data);

export const updateStatus = (id, payload) =>
  api.patch(`/reports/${id}/status`, payload).then((r) => r.data);

export const assignStaff = (id, payload) =>
  api.patch(`/reports/${id}/assign`, payload).then((r) => r.data);

export const uploadResolution = (id, formData) =>
  api.post(`/reports/${id}/resolution`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);

export const deleteReport = (id) => api.delete(`/reports/${id}`).then((r) => r.data);
