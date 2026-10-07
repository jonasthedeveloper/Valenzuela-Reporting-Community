import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts';
import Icon from '../../components/Icon';
import StatCard from '../../components/StatCard';
import { StatusBadge, PriorityBadge } from '../../components/Badges';
import { EmptyState, ErrorState, Loading } from '../../components/Feedback';
import * as dashboardService from '../../services/dashboard.service';
import { toApiError } from '../../services/api';
import { CHART_COLORS } from '../../constants';
import { formatDate, formatHours } from '../../utils/format';
import useDocumentTitle from '../../hooks/useDocumentTitle';

export default function AdminDashboard() {
  useDocumentTitle('Admin dashboard');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await dashboardService.adminDashboard();
      setData(response.data);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading label="Building the dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const { stats, monthly, daily, categories, recentReports } = data;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">City operations dashboard</h1>
          <p className="page-sub">Live figures across Barangay Ugong and Barangay Gen. T. De Leon.</p>
        </div>
        <Link className="btn btn-secondary" to="/admin/export">
          <Icon name="download" size={17} /> Export data
        </Link>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 'var(--sp-5)' }}>
        <StatCard label="Total reports" value={stats.total} icon="files" />
        <StatCard label="Pending review" value={stats.pending} icon="clock" tone="amber" />
        <StatCard label="Assigned" value={stats.assigned} icon="clipboard" />
        <StatCard label="Resolved" value={stats.resolved} icon="check-circle" tone="green" />
      </div>

      <div className="grid grid-4" style={{ marginBottom: 'var(--sp-6)' }}>
        <StatCard
          label="Average resolution time"
          value={formatHours(stats.avgResolutionHours)}
          icon="trending-up"
          hint="From filing to resolved"
        />
        <StatCard label="Active users" value={stats.activeUsers} icon="users" />
        <StatCard label="Field staff" value={stats.staffCount} icon="shield" />
        <StatCard label="Critical open" value={stats.criticalOpen} icon="alert-triangle" tone="red" />
      </div>

      <div className="grid grid-2" style={{ marginBottom: 'var(--sp-6)' }}>
        <section className="card card-pad">
          <div className="card-head" style={{ padding: 0, border: 0, marginBottom: 'var(--sp-4)' }}>
            <h2>Monthly reports</h2>
            <span className="tiny muted">
              <span className="legend-dot" style={{ background: CHART_COLORS.blue }} /> Filed
              <span className="legend-dot" style={{ background: CHART_COLORS.green, marginLeft: 10 }} /> Resolved
            </span>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6eaf2" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={30} />
                <Tooltip cursor={{ fill: 'rgba(29,78,216,.06)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="total" name="Filed" fill={CHART_COLORS.blue} radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar dataKey="resolved" name="Resolved" fill={CHART_COLORS.green} radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card card-pad">
          <div className="card-head" style={{ padding: 0, border: 0, marginBottom: 'var(--sp-4)' }}>
            <h2>Report volume trend</h2>
            <span className="tiny muted">Last 14 days</span>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6eaf2" />
                <XAxis
                  dataKey="day"
                  tickFormatter={(value) => value.slice(5)}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={30} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Reports filed"
                  stroke={CHART_COLORS.blue}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid grid-split">
        <section className="card">
          <div className="card-head">
            <h2>Latest reports</h2>
            <Link className="small" to="/admin/reports">Open report management</Link>
          </div>
          {recentReports.length === 0 ? (
            <EmptyState icon="files" title="No reports yet" text="New community reports will appear here." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Resident</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReports.map((report) => (
                    <tr key={report.id}>
                      <td className="nowrap strong">{report.reference_no}</td>
                      <td className="nowrap">
                        {report.is_anonymous ? 'Anonymous' : report.reporter_name}
                      </td>
                      <td className="nowrap">{report.category_name}</td>
                      <td><PriorityBadge priority={report.priority} /></td>
                      <td><StatusBadge status={report.status} /></td>
                      <td className="nowrap small muted">{formatDate(report.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card card-pad">
          <div className="card-head" style={{ padding: 0, border: 0, marginBottom: 'var(--sp-4)' }}>
            <h2>Reports by category</h2>
          </div>
          {categories.length === 0 ? (
            <p className="small muted">No data yet.</p>
          ) : (
            <div className="stack-sm">
              {categories.map((category) => {
                const max = Math.max(...categories.map((item) => item.total)) || 1;
                return (
                  <div key={category.name}>
                    <div className="row-between">
                      <span className="small">{category.name}</span>
                      <span className="small strong">{category.total}</span>
                    </div>
                    <div className="progress" style={{ marginTop: 4 }}>
                      <div className="progress-bar" style={{ width: `${(category.total / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
