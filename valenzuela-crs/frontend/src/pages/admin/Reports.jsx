import { useCallback, useEffect, useState } from 'react';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import Modal, { ConfirmDialog } from '../../components/Modal';
import Pagination from '../../components/Pagination';
import MediaGallery from '../../components/MediaGallery';
import { StatusBadge, PriorityBadge } from '../../components/Badges';
import { EmptyState, ErrorState, Spinner, TableSkeleton } from '../../components/Feedback';
import { TrackingStages, ProgressBar } from '../../components/Timeline';
import { SelectInput, TextArea, FormMessage } from '../../components/Field';
import * as reportService from '../../services/report.service';
import * as userService from '../../services/user.service';
import { toApiError } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { BARANGAYS, PRIORITIES, STATUS_LABELS } from '../../constants';
import { formatDate, formatDateTime } from '../../utils/format';
import useDebounce from '../../hooks/useDebounce';
import useDocumentTitle from '../../hooks/useDocumentTitle';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All priorities' },
  ...PRIORITIES.map((item) => ({ value: item.value, label: item.label })),
];

const BARANGAY_OPTIONS = [
  { value: 'all', label: 'All barangays' },
  ...BARANGAYS.map((item) => ({ value: item, label: item })),
];

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Newest first' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
  { value: 'category', label: 'Category' },
  { value: 'reference_no', label: 'Reference number' },
];

export default function AdminReports() {
  useDocumentTitle('Report management');
  const toast = useToast();

  const [filters, setFilters] = useState({
    status: 'all', priority: 'all', barangay: 'all', sort: 'created_at', dir: 'desc',
  });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const debouncedSearch = useDebounce(search);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await reportService.listReports({
        ...filters, page, limit: 10, search: debouncedSearch || undefined,
      });
      setRows(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [filters, page, debouncedSearch]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filters, debouncedSearch]);

  const setFilter = (name) => (event) => {
    setFilters((current) => ({ ...current, [name]: event.target.value }));
  };

  const toggleDir = () => {
    setFilters((current) => ({ ...current, dir: current.dir === 'desc' ? 'asc' : 'desc' }));
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const response = await reportService.deleteReport(deleteTarget.id);
      toast.success(response.message);
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Report management</h1>
          <p className="page-sub">Verify, assign, update and close community reports.</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="input-icon search-input">
          <Icon name="search" size={17} />
          <input
            className="input"
            placeholder="Search reference, title, address or resident"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select className="select" value={filters.status} onChange={setFilter('status')}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select className="select" value={filters.priority} onChange={setFilter('priority')}>
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select className="select" value={filters.barangay} onChange={setFilter('barangay')}>
          {BARANGAY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select className="select" value={filters.sort} onChange={setFilter('sort')}>
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <Button variant="secondary" icon="sort" onClick={toggleDir}>
          {filters.dir === 'desc' ? 'Descending' : 'Ascending'}
        </Button>
      </div>

      <section className="card">
        {loading ? (
          <div style={{ padding: 'var(--sp-5)' }}><TableSkeleton rows={8} columns={8} /></div>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="files"
            title="No reports match"
            text="Try a different search term or clear the filters."
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Resident</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assigned staff</th>
                    <th>Date</th>
                    <th className="right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((report) => (
                    <tr key={report.id}>
                      <td className="nowrap strong">{report.reference_no}</td>
                      <td>
                        <div className="truncate" style={{ maxWidth: 170 }}>
                          {report.is_anonymous ? 'Anonymous' : report.reporter_name}
                        </div>
                        <div className="tiny muted truncate" style={{ maxWidth: 170 }}>{report.title}</div>
                      </td>
                      <td className="nowrap">{report.category_name}</td>
                      <td><PriorityBadge priority={report.priority} /></td>
                      <td><StatusBadge status={report.status} /></td>
                      <td className="nowrap small">{report.staff_name || <span className="muted">Unassigned</span>}</td>
                      <td className="nowrap small muted">{formatDate(report.created_at)}</td>
                      <td className="cell-actions">
                        <Button size="sm" variant="secondary" icon="eye" onClick={() => setOpenId(report.id)}>
                          Manage
                        </Button>
                        <button
                          type="button"
                          className="btn-icon"
                          title="Delete report"
                          onClick={() => setDeleteTarget(report)}
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={meta} onChange={setPage} label="reports" />
          </>
        )}
      </section>

      <ManageReportModal
        id={openId}
        onClose={() => setOpenId(null)}
        onSaved={() => { load(); }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this report?"
        message={`${deleteTarget?.reference_no || ''} will be removed from the active list. This cannot be undone from the interface.`}
        confirmLabel="Delete report"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}

function ManageReportModal({ id, onClose, onSaved }) {
  const toast = useToast();
  const [report, setReport] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('pending');
  const [staffId, setStaffId] = useState('');
  const [note, setNote] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const [reportResponse, staffResponse] = await Promise.all([
        reportService.getReport(id),
        userService.activeStaff(),
      ]);
      setReport(reportResponse.data);
      setStatus(reportResponse.data.status);
      setStaffId(reportResponse.data.assigned_to ? String(reportResponse.data.assigned_to) : '');
      setStaff(staffResponse.data);
    } catch (err) {
      setMessage(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) { setReport(null); setNote(''); return; }
    fetchReport();
  }, [id, fetchReport]);

  const saveStatus = async () => {
    setSavingStatus(true);
    setMessage('');
    try {
      await reportService.updateStatus(report.id, {
        status,
        note: note || undefined,
        resolutionNote: status === 'resolved' ? note || undefined : undefined,
      });
      toast.success('Status updated.');
      setNote('');
      await fetchReport();
      onSaved();
    } catch (err) {
      setMessage(toApiError(err).message);
    } finally {
      setSavingStatus(false);
    }
  };

  const saveAssignment = async () => {
    if (!staffId) {
      setMessage('Choose a staff member first.');
      return;
    }
    setAssigning(true);
    setMessage('');
    try {
      const response = await reportService.assignStaff(report.id, {
        staffId: Number(staffId),
        note: note || undefined,
      });
      toast.success(response.message);
      setNote('');
      await fetchReport();
      onSaved();
    } catch (err) {
      setMessage(toApiError(err).message);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Modal
      open={Boolean(id)}
      title={report ? report.title : 'Report'}
      subtitle={report ? `${report.reference_no} · ${report.category_name} · Barangay ${report.barangay}` : ''}
      size="lg"
      onClose={onClose}
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      {loading || !report ? (
        <div className="row"><Spinner /> <span className="small muted">Loading report…</span></div>
      ) : (
        <div className="stack">
          {message && <FormMessage>{message}</FormMessage>}

          <div className="row wrap" style={{ gap: 8 }}>
            <PriorityBadge priority={report.priority} />
            <StatusBadge status={report.status} />
            {report.is_anonymous && <span className="badge badge-neutral">Anonymous</span>}
          </div>

          <ProgressBar status={report.status} />

          <div className="grid grid-2">
            <div>
              <div className="tiny muted">Resident</div>
              <div className="small strong">
                {report.is_anonymous ? 'Anonymous resident' : report.reporter_name}
              </div>
              <div className="tiny muted">
                {report.is_anonymous ? 'Identity withheld' : (report.reporter_phone || report.reporter_email)}
              </div>
            </div>
            <div>
              <div className="tiny muted">Address / landmark</div>
              <div className="small strong">{report.address}</div>
            </div>
          </div>

          <div>
            <div className="tiny muted">Description</div>
            <p className="small" style={{ whiteSpace: 'pre-wrap' }}>{report.description}</p>
          </div>

          <div>
            <div className="tiny muted" style={{ marginBottom: 6 }}>Photos and video</div>
            <MediaGallery items={report.evidence} emptyText="No photos were attached." />
          </div>

          {report.resolutionPhotos.length > 0 && (
            <div>
              <div className="tiny muted" style={{ marginBottom: 6 }}>Resolution proof</div>
              <MediaGallery items={report.resolutionPhotos} />
            </div>
          )}

          <div>
            <div className="tiny muted" style={{ marginBottom: 6 }}>Timeline</div>
            <TrackingStages status={report.status} entries={report.timeline} />
          </div>

          <TextArea
            label="Note for the timeline"
            name="note"
            rows={2}
            placeholder="Optional note attached to the next action."
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />

          <div className="grid grid-2">
            <div className="stack-sm">
              <SelectInput
                label="Update status"
                name="status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
              />
              <Button icon="check" loading={savingStatus} onClick={saveStatus} block>
                {status === 'closed' ? 'Close report' : 'Save status'}
              </Button>
            </div>

            <div className="stack-sm">
              <SelectInput
                label="Assign personnel"
                name="staffId"
                value={staffId}
                placeholder="Choose a field officer"
                onChange={(event) => setStaffId(event.target.value)}
                options={staff.map((member) => ({
                  value: String(member.id),
                  label: `${member.fullName} · ${member.activeCases} active`,
                }))}
              />
              <Button variant="success" icon="shield-check" loading={assigning} onClick={saveAssignment} block>
                Assign to staff
              </Button>
            </div>
          </div>

          <div className="tiny muted">Filed {formatDateTime(report.created_at)}</div>
        </div>
      )}
    </Modal>
  );
}
