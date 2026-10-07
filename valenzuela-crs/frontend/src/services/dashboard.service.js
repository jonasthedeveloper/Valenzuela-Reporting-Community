import api from './api';

export const residentDashboard = () => api.get('/dashboard/resident').then((r) => r.data);
export const adminDashboard = () => api.get('/dashboard/admin').then((r) => r.data);
export const staffDashboard = () => api.get('/dashboard/staff').then((r) => r.data);
