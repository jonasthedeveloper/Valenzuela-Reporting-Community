import { useCallback, useEffect, useState } from 'react';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import StatCard from '../../components/StatCard';
import MediaGallery from '../../components/MediaGallery';
import MediaUploader from '../../components/MediaUploader';
import { StatusBadge, PriorityBadge } from '../../components/Badges';
import { EmptyState, ErrorState, Loading, Spinner } from '../../components/Feedback';
import { TrackingStages, ProgressBar } from '../../components/Timeline';
import { SelectInput, TextArea, FormMessage } from '../../components/Field';
import * as reportService from '../../services/report.service';
import * as dashboardService from '../../services/dashboard.service';
import { toApiError } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatDate, formatDateTime, formatHours } from '../../utils/format';
import useDocumentTitle from '../../hooks/useDocumentTitle';

const STAFF_STATUSES = [
  { value: 'in_progress', label: 'In progress — work has started' },
  { value: 'resolved', label: 'Resolved — the issue is fixed' },
];

export default function StaffTasks() {
  useDocumentTitle('Assigned tasks');
  const [stats, setStats] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboard, reports] = await Promise.all([
        dashboardService.staffDashboard(),
        reportService.listReports({ status: 'ongoing', limit: 50, sort: 'priority', dir: 'desc' }),
      ]);
      setStats(dashboard.data.stats);
      setRows(reports.data);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading label="Loading your assignments…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Assigned tasks</h1>
          <p className="page-sub">Everything currently on your plate, highest priority first.</p>
        </div>
        <Button variant="secondary" icon="refresh" onClick={load}>Refresh</Button>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 'var(--sp-6)' }}>
        <StatCard label="Total assigned" value={stats.total} icon="clipboard" />
        <StatCard label="To start" value={stats.toStart} icon="clock" tone="amber" />
        <StatCard label="In progress" value={stats.inProgress} icon="refresh" />
        <StatCard label="Completed" value={stats.completed} icon="check-circle" tone="green" />
      </div>

      <section className="card">
        {rows.length === 0 ? (
          <EmptyState
            icon="clipboard-check"
            title="Nothing assigned right now"
            text="When the barangay office dispatches a report to you, it appears here."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Report</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned</th>
                  <th className="right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((report) => (
                  <tr key={report.id}>
                    <td className="nowrap strong">{report.reference_no}</td>
                    <td>
                      <div className="truncate" style={{ maxWidth: 240 }}>{report.title}</div>
                      <div className="tiny muted truncate" style={{ maxWidth: 240 }}>{report.address}</div>
                    </td>
                    <td className="nowrap">{report.category_name}</td>
                    <td><PriorityBadge priority={report.priority} /></td>
                    <td><StatusBadge status={report.status} /></td>
                    <td className="nowrap small muted">{formatDate(report.assigned_at || report.created_at)}</td>
                    <td className="cell-actions">
                      <Button size="sm" variant="secondary" icon="eye" onClick={() => setOpenId(report.id)}>
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card card-pad" style={{ marginTop: 'var(--sp-6)' }}>
        <div className="row-between wrap">
          <div className="row">
            <div className="stat-icon green"><Icon name="award" size={21} /></div>
            <div>
              <div className="strong">Performance score: {stats.performanceScore}%</div>
              <div className="small muted">
                {stats.completed} of {stats.total} assigned reports completed ·
                average turnaround {formatHours(stats.avgHours)}
              </div>
            </div>
          </div>
          <div className="progress" style={{ maxWidth: 260, width: '100%' }}>
            <div className="progress-bar" style={{ width: `${stats.performanceScore}%` }} />
          </div>
        </div>
      </section>

      <TaskModal id={openId} onClose={() => setOpenId(null)} onSaved={() => { setOpenId(null); load(); }} />
    </>
  );
}

export function TaskModal({ id, onClose, onSaved, readOnly = false }) {
  const toast = useToast();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('in_progress');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) { setReport(null); return; }
    let active = true;
    setLoading(true);
    setMessage('');
    setNote('');
    setFiles([]);
    reportService.getReport(id)
      .then((response) => {
        if (!active) return;
        setReport(response.data);
        setStatus(response.data.status === 'resolved' ? 'resolved' : 'in_progress');
      })
      .catch((err) => { if (active) setMessage(toApiError(err).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const submit = async () => {
    setSaving(true);
    setMessage('');
    try {
      if (files.length) {
        const payload = new FormData();
        files.forEach((file) => payload.append('photos', file));
        if (note) payload.append('note', note);
        await reportService.uploadResolution(report.id, payload);
      }
      if (status !== report.status || note) {
        await reportService.updateStatus(report.id, {
          status,
          note: note || undefined,
          resolutionNote: status === 'resolved' ? note || undefined : undefined,
        });
      }
      toast.success('Report updated.');
      onSaved();
    } catch (err) {
      setMessage(toApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={Boolean(id)}
      title={report ? report.title : 'Report'}
      subtitle={report ? `${report.reference_no} · ${report.category_name}` : ''}
      size="lg"
      onClose={onClose}
      footer={readOnly ? (
        <Button variant="secondary" onClick={onClose}>Close</Button>
      ) : (
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon="check" loading={saving} disabled={!report} onClick={submit}>Save update</Button>
        </>
      )}
    >
      {loading || !report ? (
        <div className="row"><Spinner /> <span className="small muted">Loading report…</span></div>
      ) : (
        <div className="stack">
          {message && <FormMessage>{message}</FormMessage>}

          <div className="row wrap" style={{ gap: 8 }}>
            <PriorityBadge priority={report.priority} />
            <StatusBadge status={report.status} />
            <span className="badge badge-neutral">Barangay {report.barangay}</span>
          </div>

          <ProgressBar status={report.status} />

          <div>
            <div className="tiny muted">Address / landmark</div>
            <div className="small strong">{report.address}</div>
          </div>

          <div>
            <div className="tiny muted">Description</div>
            <p className="small" style={{ whiteSpace: 'pre-wrap' }}>{report.description}</p>
          </div>

          <div>
            <div className="tiny muted" style={{ marginBottom: 6 }}>Resident</div>
            <div className="small strong">
              {report.is_anonymous ? 'Anonymous resident' : report.reporter_name}
            </div>
            {!report.is_anonymous && (
              <div className="tiny muted">{report.reporter_phone || report.reporter_email}</div>
            )}
          </div>

          <div>
            <div className="tiny muted" style={{ marginBottom: 6 }}>Evidence from the resident</div>
            <MediaGallery items={report.evidence} emptyText="No photos were attached." />
          </div>

          {report.resolutionPhotos.length > 0 && (
            <div>
              <div className="tiny muted" style={{ marginBottom: 6 }}>Resolution proof already uploaded</div>
              <MediaGallery items={report.resolutionPhotos} />
            </div>
          )}

          <div>
            <div className="tiny muted" style={{ marginBottom: 6 }}>Timeline</div>
            <TrackingStages status={report.status} entries={report.timeline} />
          </div>

          {!readOnly && (
            <>
              <SelectInput
                label="Update status"
                name="status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                options={STAFF_STATUSES}
              />
              <TextArea
                label="Field note"
                name="note"
                rows={3}
                placeholder="What did you find and what did you do?"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <div className="field">
                <span className="field-label">Resolution proof photos</span>
                <MediaUploader files={files} onChange={setFiles} allowVideo={false} max={4} />
              </div>
            </>
          )}

          <div className="tiny muted">Filed {formatDateTime(report.created_at)}</div>
        </div>
      )}
    </Modal>
  );
}
