import api from './api';

/**
 * Help Desk API — all endpoints are scoped to the signed-in user by the
 * backend (ownership comes from the JWT; no user_id/conversation_id is sent).
 */

/** GET /api/helpdesk/conversation — the current user's own conversation. */
export const getConversation = () => api.get('/helpdesk/conversation').then((r) => r.data);

/** GET /api/helpdesk/messages — the current user's own message history. */
export const getMessages = (limit = 100) =>
  api.get('/helpdesk/messages', { params: { limit } }).then((r) => r.data);

/** POST /api/helpdesk/chat — Gemini-powered reply, persisted in the user's thread. */
export const chat = (message) => api.post('/helpdesk/chat', { message }).then((r) => r.data);
