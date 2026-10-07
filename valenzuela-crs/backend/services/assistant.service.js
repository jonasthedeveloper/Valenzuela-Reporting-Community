/**
 * Rules-based help desk assistant.
 * Deliberately NOT an AI model: it matches keywords and answers from the database.
 */
const reportModel = require('../models/report.model');
const statsModel = require('../models/stats.model');
const { STATUS_LABELS } = require('../config/constants');

const STAGE_TEXT = {
  pending: 'waiting for a barangay officer to verify it',
  verified: 'verified and waiting for an officer to be assigned',
  assigned: 'assigned to a field officer',
  in_progress: 'being worked on right now',
  resolved: 'resolved',
  closed: 'closed',
};

const has = (text, words) => words.some((w) => text.includes(w));

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

async function latestReportAnswer(userId) {
  const report = await reportModel.findLatestForUser(userId);
  if (!report) {
    return 'You have not filed a report yet. Open "Create report" from the menu and I can track it for you here.';
  }
  const stage = STAGE_TEXT[report.status] || report.status;
  const assigned = report.staff_name ? ` It is handled by ${report.staff_name}.` : '';
  const resolved = report.resolved_at ? ` It was resolved on ${formatDate(report.resolved_at)}.` : '';
  return `Your latest report is ${report.reference_no} — "${report.title}", filed ${formatDate(report.created_at)}. `
    + `Status: ${STATUS_LABELS[report.status]}, meaning it is ${stage}.${assigned}${resolved}`;
}

async function countsAnswer(userId) {
  const s = await statsModel.residentStats(userId);
  return `You have ${Number(s.total) || 0} report(s) on file: ${Number(s.pending) || 0} pending, `
    + `${Number(s.ongoing) || 0} ongoing and ${Number(s.resolved) || 0} resolved.`;
}

async function referenceAnswer(userId, reference) {
  const report = await reportModel.findByReference(reference.toUpperCase());
  if (!report || report.user_id !== userId) {
    return `I could not find ${reference.toUpperCase()} under your account. Check the reference number in "My reports".`;
  }
  return `${report.reference_no} — "${report.title}" is ${STATUS_LABELS[report.status]}`
    + `${report.staff_name ? `, handled by ${report.staff_name}` : ''}.`;
}

const HELP_TEXT = [
  'I can help with a few things. Try one of these:',
  '• "status" — the status of your latest report',
  '• "VCRS-2026-000001" — status of a specific reference number',
  '• "how many reports" — a count of everything you filed',
  '• "how to report" — the steps for filing',
  '• "categories" — what you can report',
  '• "priority" — how the levels are used',
  '• "contact" — barangay office details',
].join('\n');

/** Returns the assistant's reply for one resident message. */
async function reply(userId, rawMessage) {
  const text = String(rawMessage || '').toLowerCase().trim();

  const refMatch = text.match(/vcrs-\d{4}-\d{6}/i);
  if (refMatch) return referenceAnswer(userId, refMatch[0]);

  if (has(text, ['status', 'ano na', 'kumusta', 'progress', 'latest report',
    'any update', 'update on', 'status update'])) {
    return latestReportAnswer(userId);
  }
  if (has(text, ['how many', 'count', 'ilan'])) return countsAnswer(userId);

  if (has(text, ['how to report', 'file a report', 'paano', 'submit a report', 'create report',
    'create a report', 'how do i create', 'how to create', 'make a report', 'new report'])) {
    return 'Open "Create report", choose a category, describe what happened, add the address or landmark, '
      + 'attach photos or a short video, pick a priority, then review the preview and submit. '
      + 'You get a reference number right away and can follow it in "My reports".';
  }
  if (has(text, ['track', 'how do i check', 'check my report', 'follow up', 'follow-up',
    'where is my report', 'see my report'])) {
    return 'Open "My reports" to see every report with its live status. The timeline shows '
      + 'Submitted → Verified → Assigned → In Progress → Resolved → Closed, and each row shows '
      + 'the reference number, priority and latest update. You can also type "status" here for '
      + 'the latest update on your most recent report.';
  }
  if (has(text, ['complain', 'complaint', 'reklamo'])) {
    return 'Complaints go through "Create report" too: pick the closest category, describe what '
      + 'happened, add the address or landmark, attach photos if you have any, choose a priority '
      + 'and submit. You will get a reference number you can track in "My reports", and barangay '
      + 'staff are notified right away.';
  }
  if (has(text, ['announcement', 'advisory', 'community feed', 'barangay news'])) {
    return 'Open "Community feed" from the menu to read barangay announcements, events and '
      + 'advisories, and to like or comment on them. Urgent ones also arrive under '
      + '"Notifications".';
  }
  if (has(text, ['notification', 'alert'])) {
    return 'Open "Notifications" from the menu — you will see updates when a report is verified, '
      + 'assigned, or resolved, plus new barangay announcements. The bell icon in the top bar '
      + 'shows how many are unread.';
  }
  if (has(text, ['profile', 'settings', 'change my number', 'update my'])) {
    return 'Use "Profile" to update your name, mobile number and address, and "Settings" to change '
      + 'your password or sign out of other devices. Your email and barangay cannot be changed '
      + 'here — contact the barangay office if those are wrong.';
  }
  if (has(text, ['category', 'categories', 'what can i report'])) {
    return 'You can report: Garbage, Road Damage, Flood, Crime, Fire, Water Leak, Street Lights, '
      + 'Fallen Trees, Animal Concerns, Illegal Parking, Lost & Found, or Other.';
  }
  // "How do I report streetlight problems?" / "paano mag-report ng baha" → point at the right
  // category, then reuse the filing steps.
  if (has(text, ['street light', 'streetlight', 'street lamp', 'flood', 'baha', 'garbage',
    'basura', 'fire', 'sunog', 'water leak', 'leak', 'fallen tree', 'animal',
    'illegal parking', 'parking', 'pothole', 'road damage', 'sirang kalsada'])) {
    return 'Pick that category in "Create report" — Street Lights, Flood, Garbage, Fire, Water Leak, '
      + 'Fallen Trees, Animal Concerns, Illegal Parking or Road Damage — then describe what '
      + 'happened, add the address or landmark, attach photos, choose a priority and submit. '
      + 'You will get a reference number you can follow in "My reports".';
  }
  if (has(text, ['priority', 'urgent', 'critical'])) {
    return 'You choose the priority yourself. Low is a minor inconvenience, Medium affects daily routine, '
      + 'High is a safety risk, Critical means people are in danger right now. '
      + 'For fires, crimes in progress or medical emergencies, call 911 first, then file the report.';
  }
  if (has(text, ['contact', 'office', 'hotline', 'number'])) {
    return 'Barangay Ugong and Barangay Gen. T. De Leon offices are open Monday to Friday, 8:00 AM to 5:00 PM. '
      + 'For emergencies call 911. For system problems, message here and a staff member will pick it up.';
  }
  if (has(text, ['lost', 'found', 'nawala'])) {
    return 'Go to "Lost & Found" to post an item with a photo, or browse what others have posted. '
      + 'If an item is yours, tap Claim and the poster is notified with your contact details.';
  }
  if (has(text, ['anonymous', 'private'])) {
    return 'Tick "Submit anonymously" before you send a report. Your name is hidden from other residents. '
      + 'Barangay staff still see it so they can follow up.';
  }
  if (has(text, ['password', 'reset', 'login', 'sign in'])) {
    return 'Change your password in Settings → Password. If you are locked out, use "Forgot password" '
      + 'on the sign-in page.';
  }
  if (has(text, ['hello', 'hi ', 'hi', 'good morning', 'good afternoon', 'kamusta', 'salamat', 'thank'])) {
    return 'Hello. I am the barangay help desk assistant. Type "status" for your latest report, '
      + 'or "help" to see what else I can answer.';
  }
  if (has(text, ['help', 'menu', 'options'])) return HELP_TEXT;

  return 'I did not catch that. I answer from your report records, so try "status", a reference number '
    + 'like VCRS-2026-000001, or type "help" for the full list. A barangay staff member also reads this thread.';
}

module.exports = { reply, HELP_TEXT };
