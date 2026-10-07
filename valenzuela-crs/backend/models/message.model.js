const { query, queryOne } = require('../config/db');

const getOrCreateConversation = async (userId) => {
  const existing = await queryOne(
    'SELECT * FROM conversations WHERE user_id = ? ORDER BY id LIMIT 1', [userId]
  );
  if (existing) return existing;
  const rows = await query('INSERT INTO conversations (user_id) VALUES (?)', [userId]);
  return queryOne('SELECT * FROM conversations WHERE id = ?', [rows.insertId]);
};

const messages = (conversationId, limit = 100) =>
  query(
    `SELECT m.id, m.body, m.sender_type, m.sender_id, m.is_read, m.created_at,
            CASE WHEN u.id IS NULL THEN 'Barangay help desk'
                 ELSE CONCAT(u.first_name, ' ', u.last_name) END AS sender_name
       FROM message_items m
       LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC, m.id ASC
      LIMIT ${Number(limit)}`,
    [conversationId]
  );

const addMessage = async ({ conversationId, senderId, senderType, body }) => {
  const rows = await query(
    `INSERT INTO message_items (conversation_id, sender_id, sender_type, body, is_read)
     VALUES (?, ?, ?, ?, ?)`,
    [conversationId, senderId, senderType, body, senderType === 'user' ? 1 : 0]
  );
  await query('UPDATE conversations SET last_message_at = NOW() WHERE id = ?', [conversationId]);
  return queryOne(
    `SELECT m.id, m.body, m.sender_type, m.sender_id, m.is_read, m.created_at,
            CASE WHEN u.id IS NULL THEN 'Barangay help desk'
                 ELSE CONCAT(u.first_name, ' ', u.last_name) END AS sender_name
       FROM message_items m LEFT JOIN users u ON u.id = m.sender_id WHERE m.id = ?`,
    [rows.insertId]
  );
};

const markConversationRead = (conversationId) =>
  query('UPDATE message_items SET is_read = 1 WHERE conversation_id = ? AND is_read = 0', [conversationId]);

module.exports = { getOrCreateConversation, messages, addMessage, markConversationRead };
