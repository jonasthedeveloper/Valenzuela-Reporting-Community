import { useCallback, useEffect, useState } from 'react';
import Button from '../../components/Button';
import Pagination from '../../components/Pagination';
import { StatusBadge, PriorityBadge } from '../../components/Badges';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/Feedback';
import * as reportService from '../../services/report.service';
import { toApiError } from '../../services/api';
import { formatDate } from '../../utils/format';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { TaskModal } from './Tasks';

const TABS = [
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export default function StaffCompleted() {
  useDocumentTitle('Completed reports');
  const [status, setStatus] = useState('resolved');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await reportService.listReports({ status, page, limit: 10 });
      setRows(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Completed reports</h1>
          <p className="page-sub">Everything you have finished, with the proof photos you submitted.</p>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`tab ${status === tab.value ? 'is-active' : ''}`}
            onClick={() => setStatus(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="card">
        {loading ? (
          <div style={{ padding: 'var(--sp-5)' }}><TableSkeleton rows={5} columns={6} /></div>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="clipboard-check"
            title="Nothing completed yet"
            text="Reports you finish will be listed here for your records."
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Report</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Completed</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((report) => (
                    <tr key={report.id}>
                      <td className="nowrap strong">{report.reference_no}</td>
                      <td>
                        <div className="truncate" style={{ maxWidth: 240 }}>{report.title}</div>
                      </td>
                      <td className="nowrap">{report.category_name}</td>
                      <td><PriorityBadge priority={report.priority} /></td>
                      <td><StatusBadge status={report.status} /></td>
                      <td className="nowrap small muted">
                        {formatDate(report.closed_at || report.resolved_at || report.updated_at)}
                      </td>
                      <td className="cell-actions">
                        <Button size="sm" variant="secondary" icon="eye" onClick={() => setOpenId(report.id)}>
                          View
                        </Button>
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

      <TaskModal id={openId} readOnly onClose={() => setOpenId(null)} onSaved={() => setOpenId(null)} />
    </>
  );
}
