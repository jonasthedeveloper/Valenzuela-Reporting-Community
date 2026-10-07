import api from './api';

export const list = (params) => api.get('/lost-found', { params }).then((r) => r.data);
export const getOne = (id) => api.get(`/lost-found/${id}`).then((r) => r.data);
export const create = (formData) =>
  api.post('/lost-found', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data);
export const claim = (id) => api.post(`/lost-found/${id}/claim`).then((r) => r.data);
export const remove = (id) => api.delete(`/lost-found/${id}`).then((r) => r.data);
