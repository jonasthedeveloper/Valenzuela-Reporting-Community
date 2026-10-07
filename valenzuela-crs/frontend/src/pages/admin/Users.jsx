import { useCallback, useEffect, useState } from 'react';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import Pagination from '../../components/Pagination';
import { ConfirmDialog } from '../../components/Modal';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/Feedback';
import * as userService from '../../services/user.service';
import { toApiError } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatDate, initials } from '../../utils/format';
import useDebounce from '../../hooks/useDebounce';
import useDocumentTitle from '../../hooks/useDocumentTitle';

const TABS = [
  { value: 'all', label: 'All residents' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Deactivated' },
];

export default function AdminUsers() {
  useDocumentTitle('Resident accounts');
  const toast = useToast();

  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [target, setTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const debouncedSearch = useDebounce(search);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await userService.listResidents({
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

  const confirmToggle = async () => {
    setSaving(true);
    try {
      const response = await userService.setActive(target.id, !target.isActive);
      toast.success(response.message);
      setTarget(null);
      load();
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Resident accounts</h1>
          <p className="page-sub">Activate or deactivate residents registered in the two barangays.</p>
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

      <div className="filter-bar">
        <div className="input-icon search-input">
          <Icon name="search" size={17} />
          <input
            className="input"
            placeholder="Search by name or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <section className="card">
        {loading ? (
          <div style={{ padding: 'var(--sp-5)' }}><TableSkeleton rows={6} columns={6} /></div>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : rows.length === 0 ? (
          <EmptyState icon="users" title="No residents found" text="Try a different search term." />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Resident</th>
                    <th>Contact</th>
                    <th>Barangay</th>
                    <th>Reports filed</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th className="right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((resident) => (
                    <tr key={resident.id}>
                      <td>
                        <div className="row">
                          <div className="avatar avatar-sm">{initials(resident.fullName)}</div>
                          <div className="strong">{resident.fullName}</div>
                        </div>
                      </td>
                      <td>
                        <div className="small">{resident.email}</div>
                        <div className="tiny muted">{resident.phone || 'No number on file'}</div>
                      </td>
                      <td className="nowrap">{resident.barangay}</td>
                      <td className="strong">{resident.reportCount}</td>
                      <td>
                        <span className={`badge badge-${resident.isActive ? 'resolved' : 'critical'}`}>
                          {resident.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="nowrap small muted">{formatDate(resident.createdAt)}</td>
                      <td className="cell-actions">
                        <Button
                          size="sm"
                          variant={resident.isActive ? 'danger' : 'success'}
                          icon={resident.isActive ? 'x-circle' : 'check-circle'}
                          onClick={() => setTarget(resident)}
                        >
                          {resident.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={meta} onChange={setPage} label="residents" />
          </>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(target)}
        title={target?.isActive ? 'Deactivate this account?' : 'Activate this account?'}
        message={target?.isActive
          ? `${target?.fullName} will be signed out everywhere and will not be able to log in until reactivated.`
          : `${target?.fullName} will be able to log in and file reports again.`}
        confirmLabel={target?.isActive ? 'Deactivate' : 'Activate'}
        variant={target?.isActive ? 'danger' : 'success'}
        loading={saving}
        onConfirm={confirmToggle}
        onClose={() => setTarget(null)}
      />
    </>
  );
}
