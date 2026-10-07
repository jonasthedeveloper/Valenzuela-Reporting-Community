import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import Pagination from '../../components/Pagination';
import { EmptyState, ErrorState, Loading } from '../../components/Feedback';
import * as notificationService from '../../services/notification.service';
import { toApiError } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { timeAgo } from '../../utils/format';
import useDocumentTitle from '../../hooks/useDocumentTitle';

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
];

const ICON_FOR = {
  status: 'refresh',
  assignment: 'clipboard-check',
  announcement: 'megaphone',
  claim: 'package',
  general: 'bell',
};

export default function Notifications() {
  useDocumentTitle('Notifications');
  const toast = useToast();
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await notificationService.list({ filter, page, limit: 15 });
      setRows(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filter]);

  const openOne = async (item) => {
    if (item.is_read) return;
    setRows((current) => current.map((row) => (row.id === item.id ? { ...row, is_read: 1 } : row)));
    try {
      await notificationService.markRead(item.id);
    } catch (err) {
      toast.error(toApiError(err).message);
    }
  };

  const markAll = async () => {
    setMarking(true);
    try {
      const response = await notificationService.markAllRead();
      toast.success(response.message);
      load();
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setMarking(false);
    }
  };

  const unread = meta?.unread ?? 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-sub">
            {unread > 0 ? `${unread} unread ${unread === 1 ? 'update' : 'updates'}.` : 'You are all caught up.'}
          </p>
        </div>
        <Button variant="secondary" icon="check" loading={marking} disabled={unread === 0} onClick={markAll}>
          Mark all as read
        </Button>
      </div>

      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`tab ${filter === tab.value ? 'is-active' : ''}`}
            onClick={() => setFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="card">
        {loading ? (
          <Loading label="Loading notifications…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="bell"
            title={filter === 'unread' ? 'No unread notifications' : 'Nothing here yet'}
            text="You will be notified when a report changes status or a field officer is assigned."
          />
        ) : (
          <>
            {rows.map((item) => {
              const body = (
                <>
                  <div className="stat-icon" style={{ width: 38, height: 38, flex: '0 0 auto' }}>
                    <Icon name={ICON_FOR[item.type] || 'bell'} size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="notif-title">{item.title}</div>
                    <div className="small muted">{item.body}</div>
                    <div className="tiny muted" style={{ marginTop: 4 }}>{timeAgo(item.created_at)}</div>
                  </div>
                </>
              );

              const className = `notif ${item.is_read ? '' : 'is-unread'}`;

              return item.link ? (
                <Link
                  key={item.id}
                  to={item.link}
                  className={className}
                  style={{ color: 'inherit', textDecoration: 'none' }}
                  onClick={() => openOne(item)}
                >
                  {body}
                </Link>
              ) : (
                <div
                  key={item.id}
                  className={className}
                  role="button"
                  tabIndex={0}
                  onClick={() => openOne(item)}
                  onKeyDown={(event) => { if (event.key === 'Enter') openOne(item); }}
                >
                  {body}
                </div>
              );
            })}
            <Pagination meta={meta} onChange={setPage} label="notifications" />
          </>
        )}
      </section>
    </>
  );
}
