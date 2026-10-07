import api from './api';

export const getThread = () => api.get('/messages/thread').then((r) => r.data);
export const sendMessage = (body) => api.post('/messages/thread', { body }).then((r) => r.data);
