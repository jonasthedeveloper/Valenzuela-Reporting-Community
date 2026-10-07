const express = require('express');
const ctrl = require('../controllers/dashboard.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/resident', requireRole('resident'), ctrl.residentDashboard);
router.get('/admin', requireRole('admin'), ctrl.adminDashboard);
router.get('/staff', requireRole('staff'), ctrl.staffDashboard);

module.exports = router;
