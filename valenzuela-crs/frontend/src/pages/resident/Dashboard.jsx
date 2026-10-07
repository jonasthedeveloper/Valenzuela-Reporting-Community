import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../../components/StatCard';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import { StatusBadge, PriorityBadge } from '../../components/Badges';
import { EmptyState, ErrorState, Loading } from '../../components/Feedback';
import * as dashboardService from '../../services/dashboard.service';
import { toApiError } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, timeAgo } from '../../utils/format';
import useDocumentTitle from '../../hooks/useDocumentTitle';

export default function ResidentDashboard() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await dashboardService.residentDashboard();
      setData(response.data);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading label="Loading your dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const { stats, recentReports, announcements } = data;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Kumusta, {user.firstName}.</h1>
          <p className="page-sub">
            Here is what is happening with your reports in Barangay {user.barangay}.
          </p>
        </div>
        <Link className="btn btn-primary" to="/reports/new">
          <Icon name="file-plus" size={17} /> File a report
        </Link>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 'var(--sp-6)' }}>
        <StatCard label="Total reports" value={stats.total} icon="files" />
        <StatCard label="Pending" value={stats.pending} icon="clock" tone="amber" />
        <StatCard label="Ongoing" value={stats.ongoing} icon="refresh" />
        <StatCard label="Resolved" value={stats.resolved} icon="check-circle" tone="green" />
      </div>

      <div className="grid grid-split">
        <section className="card">
          <div className="card-head">
            <h2>Your recent reports</h2>
            <Link className="small" to="/reports">View all</Link>
          </div>

          {recentReports.length === 0 ? (
            <EmptyState
              icon="file-plus"
              title="No reports yet"
              text="When you file a report, it appears here with its current status."
            />
          ) : (
            <div>
              {recentReports.map((report) => (
                <Link
                  key={report.id}
                  to={`/reports/${report.id}`}
                  className="row-between"
                  style={{
                    padding: 'var(--sp-4) var(--sp-5)',
                    borderBottom: '1px solid var(--ink-100)',
                    color: 'inherit', textDecoration: 'none',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="strong truncate">{report.title}</div>
                    <div className="tiny muted">
                      {report.reference_no} · {report.category_name} · {formatDate(report.created_at)}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <PriorityBadge priority={report.priority} />
                    <StatusBadge status={report.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Announcements</h2>
            <Link className="small" to="/feed">Open feed</Link>
          </div>

          {announcements.length === 0 ? (
            <EmptyState
              icon="megaphone"
              title="Nothing posted yet"
              text="Barangay notices and advisories will show up here."
            />
          ) : (
            <div className="stack" style={{ padding: 'var(--sp-5)' }}>
              {announcements.map((item) => (
                <article key={item.id} className="stack-sm">
                  <div className="row" style={{ gap: 8 }}>
                    <span className={`badge badge-${item.type === 'advisory' ? 'high' : item.type === 'event' ? 'resolved' : 'verified'}`}>
                      {item.type}
                    </span>
                    <span className="tiny muted">{timeAgo(item.publish_at || item.created_at)}</span>
                  </div>
                  <div className="strong">{item.title}</div>
                  <p className="small muted" style={{
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card card-pad" style={{ marginTop: 'var(--sp-6)' }}>
        <div className="row-between wrap">
          <div className="row">
            <div className="stat-icon green"><Icon name="message-circle" size={22} /></div>
            <div>
              <div className="strong">Need an update fast?</div>
              <div className="small muted">
                Ask the help desk for the status of your latest report without opening the table.
              </div>
            </div>
          </div>
          <Link to="/messages"><Button variant="secondary" icon="message-circle">Open help desk</Button></Link>
        </div>
      </section>
    </>
  );
}
