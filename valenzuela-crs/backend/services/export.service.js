const ExcelJS = require('exceljs');
const { STATUS_LABELS } = require('../config/constants');

const COLUMNS = [
  { header: 'Reference', key: 'reference_no', width: 20 },
  { header: 'Title', key: 'title', width: 34 },
  { header: 'Resident', key: 'reporter', width: 24 },
  { header: 'Category', key: 'category_name', width: 18 },
  { header: 'Barangay', key: 'barangay', width: 18 },
  { header: 'Address', key: 'address', width: 34 },
  { header: 'Priority', key: 'priority', width: 12 },
  { header: 'Status', key: 'status_label', width: 14 },
  { header: 'Assigned staff', key: 'staff', width: 24 },
  { header: 'Submitted', key: 'created', width: 20 },
  { header: 'Resolved', key: 'resolved', width: 20 },
];

const fmt = (value) => (value ? new Date(value).toISOString().slice(0, 16).replace('T', ' ') : '');

const toRow = (r) => ({
  reference_no: r.reference_no,
  title: r.title,
  reporter: r.is_anonymous ? 'Anonymous' : r.reporter_name,
  category_name: r.category_name,
  barangay: r.barangay,
  address: r.address,
  priority: r.priority.charAt(0).toUpperCase() + r.priority.slice(1),
  status_label: STATUS_LABELS[r.status],
  staff: r.staff_name || 'Unassigned',
  created: fmt(r.created_at),
  resolved: fmt(r.resolved_at),
});

const escapeCsv = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const toCsv = (reports) => {
  const header = COLUMNS.map((c) => c.header).join(',');
  const lines = reports.map((r) => {
    const row = toRow(r);
    return COLUMNS.map((c) => escapeCsv(row[c.key])).join(',');
  });
  return ['\uFEFF' + header, ...lines].join('\r\n');
};

const toXlsx = async (reports) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Valenzuela Community Reporting System';
  wb.created = new Date();

  const ws = wb.addWorksheet('Reports', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  ws.columns = COLUMNS;
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
  ws.getRow(1).alignment = { vertical: 'middle' };
  ws.getRow(1).height = 22;

  reports.forEach((r) => ws.addRow(toRow(r)));
  ws.autoFilter = { from: 'A1', to: { row: 1, column: COLUMNS.length } };

  return wb.xlsx.writeBuffer();
};

module.exports = { toCsv, toXlsx };
