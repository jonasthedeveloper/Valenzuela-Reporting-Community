import api from './api';

/** Public: latest published announcements for the welcome page (no session). */
export const preview = () => api.get('/announcements/preview').then((r) => r.data);

export const feed = (params) => api.get('/announcements', { params }).then((r) => r.data);
export const listAll = (params) => api.get('/announcements/manage', { params }).then((r) => r.data);
export const create = (payload) => api.post('/announcements', payload).then((r) => r.data);
export const update = (id, payload) => api.put(`/announcements/${id}`, payload).then((r) => r.data);
export const remove = (id) => api.delete(`/announcements/${id}`).then((r) => r.data);
export const toggleLike = (id) => api.post(`/announcements/${id}/like`).then((r) => r.data);
export const comments = (id) => api.get(`/announcements/${id}/comments`).then((r) => r.data);
export const addComment = (id, payload) =>
  api.post(`/announcements/${id}/comments`, payload).then((r) => r.data);
export const deleteComment = (id, commentId) =>
  api.delete(`/announcements/${id}/comments/${commentId}`).then((r) => r.data);
