import api from './api';

const download = async (path, params, filename) => {
  const response = await api.get(path, { params, responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const stamp = () => new Date().toISOString().slice(0, 10);

export const exportCsv = (params) =>
  download('/export/reports.csv', params, `valenzuela-reports-${stamp()}.csv`);

export const exportXlsx = (params) =>
  download('/export/reports.xlsx', params, `valenzuela-reports-${stamp()}.xlsx`);
