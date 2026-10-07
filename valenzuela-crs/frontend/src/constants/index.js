export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Valenzuela Community Reporting System';
export const APP_TAGLINE = import.meta.env.VITE_APP_TAGLINE || 'Ulat, Maagap, Alisto';

export const BARANGAYS = ['Ugong', 'Gen. T. De Leon'];

export const PRIORITIES = [
  { value: 'low', label: 'Low', hint: 'A minor inconvenience, no rush.' },
  { value: 'medium', label: 'Medium', hint: 'Affects daily routine in the area.' },
  { value: 'high', label: 'High', hint: 'A safety risk if left alone.' },
  { value: 'critical', label: 'Critical', hint: 'People are in danger right now.' },
];

export const STATUS_LABELS = {
  pending: 'Pending',
  verified: 'Verified',
  assigned: 'Assigned',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const TRACKING_STAGES = [
  { key: 'pending', label: 'Submitted', hint: 'Your report reached the barangay.' },
  { key: 'verified', label: 'Verified', hint: 'An officer confirmed the details.' },
  { key: 'assigned', label: 'Assigned', hint: 'A field officer is responsible for it.' },
  { key: 'in_progress', label: 'In progress', hint: 'Work on the ground has started.' },
  { key: 'resolved', label: 'Resolved', hint: 'The issue was fixed.' },
  { key: 'closed', label: 'Closed', hint: 'The case is complete.' },
];

export const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'resolved', label: 'Resolved' },
];

export const ANNOUNCEMENT_TYPES = [
  { value: 'announcement', label: 'Announcement' },
  { value: 'event', label: 'Event' },
  { value: 'advisory', label: 'Advisory' },
];

export const CHART_COLORS = {
  blue: '#1d4ed8',
  blueLight: '#93b8fd',
  green: '#16a34a',
  amber: '#d97706',
  ink: '#94a1b8',
};
