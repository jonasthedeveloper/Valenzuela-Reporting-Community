const asyncHandler = require('../utils/asyncHandler');
const messageModel = require('../models/message.model');
const gemini = require('../services/gemini.service');
const rulesAssistant = require('../services/assistant.service');

const MAX_MESSAGE_LENGTH = 2000;
const HISTORY_LIMIT = 20;

/**
 * POST /api/helpdesk/chat  { message }
 * → { success, reply, mode, userMessage, assistantMessage }
 *
 * The resident's message and the assistant's reply are persisted in the existing
 * conversations / message_items tables (the same thread the Help Desk page loads),
 * so a page refresh keeps the conversation.
 *
 * Modes: 'gemini' (AI reply), 'rules' (no GEMINI_API_KEY configured — the
 * built-in rules assistant answers instead), 'error' (Gemini failed — resident
 * sees a friendly message, details are logged server-side only).
 */
const chat = asyncHandler(async (req, res) => {
  const message = String(req.body.message || '').trim().slice(0, MAX_MESSAGE_LENGTH);
  const conversation = await messageModel.getOrCreateConversation(req.user.id);

  const userMessage = await messageModel.addMessage({
    conversationId: conversation.id,
    senderId: req.user.id,
    senderType: 'user',
    body: message,
  });

  let reply;
  let mode;

  if (gemini.isConfigured()) {
    try {
      const history = await messageModel.messages(conversation.id, HISTORY_LIMIT);
      reply = await gemini.chat(history);
      mode = 'gemini';
    } catch (err) {
      // Technical detail stays on the server; residents only see the friendly text.
      console.error('[helpdesk] Gemini request failed:', String(err && err.message || err).slice(0, 300));
      reply = gemini.FALLBACK_ERROR;
      mode = 'error';
    }
  } else {
    reply = await rulesAssistant.reply(req.user.id, message);
    mode = 'rules';
  }

  const assistantMessage = await messageModel.addMessage({
    conversationId: conversation.id,
    senderId: null,
    senderType: 'assistant',
    body: reply,
  });

  res.status(201).json({ success: true, reply, mode, userMessage, assistantMessage });
});

/**
 * GET /api/helpdesk/conversation
 * → { success, conversation }
 *
 * Returns the authenticated user's own Help Desk conversation (created on first
 * access). Ownership is derived exclusively from req.user.id (JWT) — the client
 * never supplies a user id or conversation id, so no other user's conversation
 * can ever be read or written through this endpoint.
 */
const conversation = asyncHandler(async (req, res) => {
  const convo = await messageModel.getOrCreateConversation(req.user.id);
  res.json({
    success: true,
    conversation: {
      id: convo.id,
      subject: convo.subject,
      assistantName: 'Barangay help desk',
      online: true,
      lastMessageAt: convo.last_message_at,
    },
  });
});

/**
 * GET /api/helpdesk/messages?limit=100
 * → { success, messages }
 *
 * Returns ONLY the authenticated user's Help Desk messages. The conversation is
 * resolved from req.user.id — no conversation_id is accepted from the client,
 * which makes cross-account access impossible.
 */
const messagesList = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
  const convo = await messageModel.getOrCreateConversation(req.user.id);
  const items = await messageModel.messages(convo.id, limit);
  await messageModel.markConversationRead(convo.id);
  res.json({ success: true, messages: items });
});

module.exports = { chat, conversation, messagesList };
