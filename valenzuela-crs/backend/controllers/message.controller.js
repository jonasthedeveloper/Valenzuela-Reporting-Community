const asyncHandler = require('../utils/asyncHandler');
const model = require('../models/message.model');
const assistant = require('../services/assistant.service');

const getThread = asyncHandler(async (req, res) => {
  const conversation = await model.getOrCreateConversation(req.user.id);
  const items = await model.messages(conversation.id);
  await model.markConversationRead(conversation.id);

  res.json({
    success: true,
    data: {
      conversation: {
        id: conversation.id,
        subject: conversation.subject,
        assistantName: 'Barangay help desk',
        online: true,
      },
      messages: items,
    },
  });
});

const sendMessage = asyncHandler(async (req, res) => {
  const conversation = await model.getOrCreateConversation(req.user.id);

  const userMessage = await model.addMessage({
    conversationId: conversation.id,
    senderId: req.user.id,
    senderType: 'user',
    body: req.body.body,
  });

  const answer = await assistant.reply(req.user.id, req.body.body);
  const assistantMessage = await model.addMessage({
    conversationId: conversation.id,
    senderId: null,
    senderType: 'assistant',
    body: answer,
  });

  res.status(201).json({ success: true, data: { userMessage, assistantMessage } });
});

module.exports = { getThread, sendMessage };
