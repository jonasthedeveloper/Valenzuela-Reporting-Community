const express = require('express');

const router = express.Router();

router.get('/health', (_req, res) =>
  res.json({ success: true, service: 'Valenzuela CRS API', time: new Date().toISOString() }));

router.use('/auth', require('./auth.routes'));
router.use('/reports', require('./report.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/announcements', require('./announcement.routes'));
router.use('/community', require('./community.routes'));
router.use('/lost-found', require('./lostfound.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/messages', require('./message.routes'));
router.use('/helpdesk', require('./helpdesk.routes'));
router.use('/users', require('./user.routes'));
router.use('/export', require('./export.routes'));

module.exports = router;
