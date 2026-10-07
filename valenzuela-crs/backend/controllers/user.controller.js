const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const userModel = require('../models/user.model');
const tokenModel = require('../models/token.model');
const { hashPassword } = require('../utils/password');
const { publicUser } = require('./auth.controller');
const { getPagination, meta } = require('../utils/pagination');

const getProfile = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: publicUser(req.user) } });
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await userModel.updateProfile(req.user.id, req.body);
  res.json({ success: true, message: 'Profile saved.', data: { user: publicUser(user) } });
});

const listResidents = asyncHandler(async (req, res) => {
  const { page, limit } = getPagination(req.query, 10);
  const { rows, total } = await userModel.listByRole('resident', {
    search: req.query.search?.trim() || '',
    status: req.query.status || 'all',
    page, limit,
  });
  res.json({
    success: true,
    data: rows.map((u) => ({ ...publicUser(u), reportCount: Number(u.report_count) })),
    meta: meta(total, page, limit),
  });
});

const setActive = asyncHandler(async (req, res) => {
  const target = await userModel.findById(req.params.id);
  if (!target) throw ApiError.notFound('That account no longer exists.');
  if (target.id === req.user.id) throw ApiError.badRequest('You cannot deactivate your own account.');

  const isActive = Boolean(req.body.isActive);
  const user = await userModel.setActive(target.id, isActive);
  if (!isActive) {
    await tokenModel.revokeAllForUser(target.id);
    await userModel.bumpTokenVersion(target.id);
  }

  res.json({
    success: true,
    message: isActive ? 'Account activated.' : 'Account deactivated.',
    data: { user: publicUser(user) },
  });
});

const listStaff = asyncHandler(async (req, res) => {
  const rows = await userModel.listStaffWithStats({ search: req.query.search?.trim() || '' });
  res.json({
    success: true,
    data: rows.map((s) => {
      const total = Number(s.total_cases);
      const completed = Number(s.completed_cases);
      return {
        id: s.id,
        fullName: `${s.first_name} ${s.last_name}`,
        email: s.email,
        phone: s.phone,
        barangay: s.barangay,
        position: s.position,
        isActive: Boolean(s.is_active),
        activeCases: Number(s.active_cases),
        completedCases: completed,
        totalCases: total,
        avgHours: s.avg_hours === null ? null : Number(s.avg_hours),
        performanceScore: total ? Math.round((completed / total) * 100) : 0,
        createdAt: s.created_at,
      };
    }),
  });
});

const activeStaff = asyncHandler(async (_req, res) => {
  const rows = await userModel.activeStaff();
  res.json({
    success: true,
    data: rows.map((s) => ({
      id: s.id,
      fullName: `${s.first_name} ${s.last_name}`,
      position: s.position,
      barangay: s.barangay,
      activeCases: Number(s.active_cases),
    })),
  });
});

const createStaff = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, password, barangay, position } = req.body;
  if (await userModel.emailExists(email)) {
    throw ApiError.conflict('That email already belongs to an account.');
  }
  const user = await userModel.create({
    firstName, lastName, email: email.toLowerCase(), phone, barangay, position,
    passwordHash: await hashPassword(password),
    role: 'staff',
  });
  res.status(201).json({
    success: true,
    message: `Staff account created for ${user.first_name} ${user.last_name}.`,
    data: { user: publicUser(user) },
  });
});

module.exports = {
  getProfile, updateProfile, listResidents, setActive, listStaff, activeStaff, createStaff,
};
