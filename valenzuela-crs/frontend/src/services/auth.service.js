import api from './api';

export const register = (payload) => api.post('/auth/register', payload).then((r) => r.data);
export const login = (payload) => api.post('/auth/login', payload).then((r) => r.data);
export const logout = () => api.post('/auth/logout').then((r) => r.data);
export const logoutAll = () => api.post('/auth/logout-all').then((r) => r.data);
export const me = () => api.get('/auth/me').then((r) => r.data);
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email }).then((r) => r.data);
export const resetPassword = (payload) => api.post('/auth/reset-password', payload).then((r) => r.data);
export const changePassword = (payload) => api.post('/auth/change-password', payload).then((r) => r.data);
export const setTwoFactor = (enabled) => api.post('/auth/two-factor', { enabled }).then((r) => r.data);
