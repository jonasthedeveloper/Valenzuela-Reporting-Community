import api from './api';

export const getProfile = () => api.get('/users/me').then((r) => r.data);
export const updateProfile = (payload) => api.put('/users/me', payload).then((r) => r.data);
export const listResidents = (params) => api.get('/users/residents', { params }).then((r) => r.data);
export const setActive = (id, isActive) =>
  api.patch(`/users/${id}/status`, { isActive }).then((r) => r.data);
export const listStaff = (params) => api.get('/users/staff', { params }).then((r) => r.data);
export const activeStaff = () => api.get('/users/staff/active').then((r) => r.data);
export const createStaff = (payload) => api.post('/users/staff', payload).then((r) => r.data);
