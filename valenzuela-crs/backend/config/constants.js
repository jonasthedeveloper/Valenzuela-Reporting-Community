const BARANGAYS = ['Ugong', 'Gen. T. De Leon'];
const ROLES = ['resident', 'staff', 'admin'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['pending', 'verified', 'assigned', 'in_progress', 'resolved', 'closed'];

const STATUS_LABELS = {
  pending: 'Pending',
  verified: 'Verified',
  assigned: 'Assigned',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

module.exports = { BARANGAYS, ROLES, PRIORITIES, STATUSES, STATUS_LABELS };
