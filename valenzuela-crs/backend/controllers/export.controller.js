const asyncHandler = require('../utils/asyncHandler');
const reportModel = require('../models/report.model');
const exportService = require('../services/export.service');

const buildFilters = (query) => ({
  status: query.status,
  priority: query.priority,
  categoryId: query.categoryId || undefined,
  barangay: query.barangay,
  search: query.search?.trim(),
  dateFrom: query.dateFrom,
  dateTo: query.dateTo,
});

const stamp = () => new Date().toISOString().slice(0, 10);

const exportCsv = asyncHandler(async (req, res) => {
  const reports = await reportModel.listAll(buildFilters(req.query));
  const csv = exportService.toCsv(reports);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="valenzuela-reports-${stamp()}.csv"`);
  res.send(csv);
});

const exportXlsx = asyncHandler(async (req, res) => {
  const reports = await reportModel.listAll(buildFilters(req.query));
  const buffer = await exportService.toXlsx(reports);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="valenzuela-reports-${stamp()}.xlsx"`);
  res.send(Buffer.from(buffer));
});

module.exports = { exportCsv, exportXlsx };
