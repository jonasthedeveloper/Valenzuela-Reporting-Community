import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon';
import Pagination from '../../components/Pagination';
import { StatusBadge, PriorityBadge } from '../../components/Badges';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/Feedback';
import * as reportService from '../../services/report.service';
import { toApiError } from '../../services/api';
import { STATUS_FILTERS } from '../../constants';
import { formatDate } from '../../utils/format';
import useDebounce from '../../hooks/useDebounce';
import useDocumentTitle from '../../hooks/useDocumentTitle';

export default function MyReports() {
  useDocumentTitle('My reports');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const debouncedSearch = useDebounce(search);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await reportService.listReports({
        status, page, limit: 10, search: debouncedSearch || undefined,
      });
      setRows(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [status, page, debouncedSearch]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status, debouncedSearch]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">My reports</h1>
          <p className="page-sub">Track every report you filed and see how far along it is.</p>
        </div>
        <Link className="btn btn-primary" to="/reports/new">
          <Icon name="file-plus" size={17} /> File a report
        </Link>
      </div>

      <div className="tabs">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`tab ${status === filter.value ? 'is-active' : ''}`}
            onClick={() => setStatus(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="filter-bar">
        <div className="input-icon search-input">
          <Icon name="search" size={17} />
          <input
            className="input"
            placeholder="Search by reference number, title or address"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <section className="card">
        {loading ? (
          <div style={{ padding: 'var(--sp-5)' }}><TableSkeleton rows={6} columns={5} /></div>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="files"
            title="No reports here"
            text={status === 'all'
              ? 'You have not filed a report yet. Start with the button above.'
              : 'Nothing matches this filter right now.'}
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Filed</th>
                    <th className="right">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((report) => (
                    <tr key={report.id}>
                      <td className="nowrap strong">{report.reference_no}</td>
                      <td>
                        <div className="truncate" style={{ maxWidth: 260 }}>{report.title}</div>
                        <div className="tiny muted truncate" style={{ maxWidth: 260 }}>{report.address}</div>
                      </td>
                      <td className="nowrap">{report.category_name}</td>
                      <td><PriorityBadge priority={report.priority} /></td>
                      <td><StatusBadge status={report.status} /></td>
                      <td className="nowrap small muted">{formatDate(report.created_at)}</td>
                      <td className="cell-actions">
                        <Link className="btn btn-secondary btn-sm" to={`/reports/${report.id}`}>
                          <Icon name="eye" size={15} /> View
                        </Link>
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
    </>
  );
}
