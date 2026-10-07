const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const reportModel = require('../models/report.model');
const userModel = require('../models/user.model');
const { getPagination, meta } = require('../utils/pagination');
const { mediaTypeOf, publicPath } = require('../middleware/upload');
const notify = require('../services/notification.service');
const { STATUSES } = require('../config/constants');

const mapFiles = (files = [], folder) =>
  files.map((f) => ({
    path: publicPath(folder, f.filename),
    name: f.originalname.slice(0, 160),
    mime: f.mimetype,
    size: f.size,
    type: mediaTypeOf(f.mimetype),
  }));

/** Residents see their own reports, staff see their assignments, admins see everything. */
const scopeFor = (user, query) => {
  if (user.role === 'resident') return { userId: user.id };
  if (user.role === 'staff') return { assignedTo: user.id };
  return { barangay: query.barangay };
};

const listReports = asyncHandler(async (req, res) => {
  const { page, limit } = getPagination(req.query, 10);
  const filters = {
    ...scopeFor(req.user, req.query),
    status: req.query.status,
    priority: req.query.priority,
    categoryId: req.query.categoryId || undefined,
    search: req.query.search?.trim(),
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
  };

  const { rows, total } = await reportModel.list(filters, {
    page, limit, sort: req.query.sort, dir: req.query.dir,
  });

  res.json({
    success: true,
    data: rows.map((r) => reportModel.maskAnonymous(r, req.user.role)),
    meta: meta(total, page, limit),
  });
});

const getReport = asyncHandler(async (req, res) => {
  const report = await reportModel.findById(req.params.id);
  if (!report) throw ApiError.notFound('That report no longer exists.');

  const isOwner = report.user_id === req.user.id;
  const isAssigned = report.assigned_to === req.user.id;
  if (req.user.role === 'resident' && !isOwner) throw ApiError.forbidden();
  if (req.user.role === 'staff' && !isAssigned) throw ApiError.forbidden('This report is not assigned to you.');

  const [media, timeline] = await Promise.all([
    reportModel.getMedia(report.id),
    reportModel.getTimeline(report.id),
  ]);

  res.json({
    success: true,
    data: {
      ...reportModel.maskAnonymous(report, req.user.role),
      evidence: media.filter((m) => m.kind === 'evidence'),
      resolutionPhotos: media.filter((m) => m.kind === 'resolution'),
      timeline,
    },
  });
});

const createReport = asyncHandler(async (req, res) => {
  const { categoryId, title, description, address, priority, isAnonymous } = req.body;

  const id = await reportModel.create({
    userId: req.user.id,
    categoryId: Number(categoryId),
    title,
    description,
    address,
    barangay: req.user.barangay,
    priority,
    isAnonymous: isAnonymous === 'true' || isAnonymous === true,
    media: mapFiles(req.files, 'reports'),
  });

  const report = await reportModel.findById(id);
  res.status(201).json({
    success: true,
    message: `Report filed. Your reference number is ${report.reference_no}.`,
    data: report,
  });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (!STATUSES.includes(status)) throw ApiError.badRequest('That status is not recognised.');

  const existing = await reportModel.findById(req.params.id);
  if (!existing) throw ApiError.notFound('That report no longer exists.');
  if (req.user.role === 'staff') {
    if (existing.assigned_to !== req.user.id) throw ApiError.forbidden('This report is not assigned to you.');
    if (!['in_progress', 'resolved'].includes(status)) {
      throw ApiError.forbidden('Field officers can set a report to in progress or resolved.');
    }
  }

  const report = await reportModel.updateStatus(req.params.id, status, {
    note, actorId: req.user.id, resolutionNote: req.body.resolutionNote,
  });
  await notify.notifyStatusChange(report, status);

  res.json({ success: true, message: 'Status updated.', data: report });
});

const assignStaff = asyncHandler(async (req, res) => {
  const staff = await userModel.findById(req.body.staffId);
  if (!staff || staff.role !== 'staff') throw ApiError.badRequest('Choose an active staff member.');
  if (!staff.is_active) throw ApiError.badRequest('That staff account is deactivated.');

  const report = await reportModel.assign(req.params.id, staff.id, req.user.id, req.body.note);
  if (!report) throw ApiError.notFound('That report no longer exists.');

  await notify.notifyAssignment(report, staff.id);
  await notify.notifyStatusChange(report, report.status);

  res.json({ success: true, message: `Assigned to ${staff.first_name} ${staff.last_name}.`, data: report });
});

const uploadResolution = asyncHandler(async (req, res) => {
  const report = await reportModel.findById(req.params.id);
  if (!report) throw ApiError.notFound('That report no longer exists.');
  if (req.user.role === 'staff' && report.assigned_to !== req.user.id) {
    throw ApiError.forbidden('This report is not assigned to you.');
  }
  if (!req.files?.length) throw ApiError.badRequest('Attach at least one photo of the completed work.');

  await reportModel.addMedia(report.id, mapFiles(req.files, 'resolutions'), 'resolution', req.user.id);
  if (req.body.note) {
    await reportModel.addTimelineEntry(report.id, report.status, req.body.note, req.user.id);
  }

  const media = await reportModel.getMedia(report.id);
  res.status(201).json({
    success: true,
    message: 'Resolution photos uploaded.',
    data: media.filter((m) => m.kind === 'resolution'),
  });
});

const deleteReport = asyncHandler(async (req, res) => {
  const report = await reportModel.findById(req.params.id);
  if (!report) throw ApiError.notFound('That report no longer exists.');
  await reportModel.softDelete(report.id);
  res.json({ success: true, message: `${report.reference_no} deleted.` });
});

const listCategories = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await reportModel.categories() });
});

module.exports = {
  listReports, getReport, createReport, updateStatus, assignStaff,
  uploadResolution, deleteReport, listCategories,
};
