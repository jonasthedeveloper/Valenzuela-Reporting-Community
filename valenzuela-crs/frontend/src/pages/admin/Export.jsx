import { useEffect, useState } from 'react';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import { SelectInput, TextInput } from '../../components/Field';
import * as exportService from '../../services/export.service';
import * as reportService from '../../services/report.service';
import { toApiError } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { BARANGAYS, PRIORITIES, STATUS_LABELS } from '../../constants';
import useDocumentTitle from '../../hooks/useDocumentTitle';

const emptyFilters = {
  status: 'all', priority: 'all', barangay: 'all', categoryId: '', dateFrom: '', dateTo: '',
};

export default function AdminExport() {
  useDocumentTitle('Export data');
  const toast = useToast();

  const [filters, setFilters] = useState(emptyFilters);
  const [categories, setCategories] = useState([]);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    reportService.listCategories()
      .then((response) => setCategories(response.data))
      .catch(() => setCategories([]));
  }, []);

  const setField = (name) => (event) => {
    setFilters((current) => ({ ...current, [name]: event.target.value }));
  };

  const cleanParams = () => {
    const params = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') params[key] = value;
    });
    return params;
  };

  const run = async (format) => {
    setBusy(format);
    try {
      if (format === 'csv') await exportService.exportCsv(cleanParams());
      else await exportService.exportXlsx(cleanParams());
      toast.success(`Export ready. Check your downloads folder.`);
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Reports &amp; export</h1>
          <p className="page-sub">Download live report records as CSV or Excel for council reporting.</p>
        </div>
      </div>

      <section className="card card-pad" style={{ maxWidth: 820 }}>
        <h2 style={{ fontSize: '1rem', marginBottom: 'var(--sp-4)' }}>Filter the export</h2>

        <div className="grid grid-3">
          <SelectInput
            label="Status" name="status" value={filters.status} onChange={setField('status')}
            options={[
              { value: 'all', label: 'All statuses' },
              ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
          <SelectInput
            label="Priority" name="priority" value={filters.priority} onChange={setField('priority')}
            options={[
              { value: 'all', label: 'All priorities' },
              ...PRIORITIES.map((item) => ({ value: item.value, label: item.label })),
            ]}
          />
          <SelectInput
            label="Barangay" name="barangay" value={filters.barangay} onChange={setField('barangay')}
            options={[
              { value: 'all', label: 'All barangays' },
              ...BARANGAYS.map((item) => ({ value: item, label: item })),
            ]}
          />
        </div>

        <div className="grid grid-3" style={{ marginTop: 'var(--sp-4)' }}>
          <SelectInput
            label="Category" name="categoryId" value={filters.categoryId} onChange={setField('categoryId')}
            placeholder="All categories"
            options={categories.map((category) => ({ value: String(category.id), label: category.name }))}
          />
          <TextInput label="From date" name="dateFrom" type="date"
            value={filters.dateFrom} onChange={setField('dateFrom')} />
          <TextInput label="To date" name="dateTo" type="date"
            value={filters.dateTo} onChange={setField('dateTo')} />
        </div>

        <div className="row wrap" style={{ marginTop: 'var(--sp-5)' }}>
          <Button icon="download" loading={busy === 'csv'} onClick={() => run('csv')}>
            Download CSV
          </Button>
          <Button variant="success" icon="download" loading={busy === 'xlsx'} onClick={() => run('xlsx')}>
            Download Excel
          </Button>
          <Button variant="ghost" icon="refresh" onClick={() => setFilters(emptyFilters)}>
            Reset filters
          </Button>
        </div>
      </section>

      <section className="card card-pad" style={{ maxWidth: 820, marginTop: 'var(--sp-5)' }}>
        <div className="row">
          <div className="stat-icon"><Icon name="info" size={19} /></div>
          <div>
            <div className="strong">What is included</div>
            <p className="small muted" style={{ maxWidth: 560 }}>
              Every matching report with its reference number, resident, category, priority, status,
              assigned officer, address, barangay, filing date and resolution date. Anonymous reports are
              exported with the reporter marked as anonymous.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
