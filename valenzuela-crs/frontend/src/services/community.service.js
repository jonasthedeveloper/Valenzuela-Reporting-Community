import api from './api';

export const list = (params) => api.get('/community/posts', { params }).then((r) => r.data);
export const create = (payload) => api.post('/community/posts', payload).then((r) => r.data);
export const remove = (id) => api.delete(`/community/posts/${id}`).then((r) => r.data);
export const toggleLike = (id) => api.post(`/community/posts/${id}/like`).then((r) => r.data);

export const comments = (id) => api.get(`/community/posts/${id}/comments`).then((r) => r.data);
export const addComment = (id, payload) =>
  api.post(`/community/posts/${id}/comments`, payload).then((r) => r.data);
export const addReply = (commentId, payload) =>
  api.post(`/community/comments/${commentId}/replies`, payload).then((r) => r.data);
export const removeComment = (id) => api.delete(`/community/comments/${id}`).then((r) => r.data);
