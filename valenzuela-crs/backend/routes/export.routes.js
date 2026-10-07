const express = require('express');
const ctrl = require('../controllers/export.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.get('/reports.csv', ctrl.exportCsv);
router.get('/reports.xlsx', ctrl.exportXlsx);

module.exports = router;
