import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import MediaGallery from '../../components/MediaGallery';
import { StatusBadge, PriorityBadge } from '../../components/Badges';
import { ErrorState, Loading } from '../../components/Feedback';
import { ProgressBar, TrackingStages } from '../../components/Timeline';
import * as reportService from '../../services/report.service';
import { toApiError } from '../../services/api';
import { formatDateTime } from '../../utils/format';
import useDocumentTitle from '../../hooks/useDocumentTitle';

export default function ReportDetail() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useDocumentTitle(report ? report.reference_no : 'Report');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await reportService.getReport(id);
      setReport(response.data);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading label="Opening report…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <>
      <div className="page-head">
        <div>
          <Link className="small" to="/reports">
            <Icon name="arrow-left" size={14} /> Back to my reports
          </Link>
          <h1 className="page-title" style={{ marginTop: 6 }}>{report.title}</h1>
          <p className="page-sub">
            {report.reference_no} · Filed {formatDateTime(report.created_at)}
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <PriorityBadge priority={report.priority} />
          <StatusBadge status={report.status} />
        </div>
      </div>

      <div className="grid grid-split">
        <div className="stack">
          <section className="card card-pad">
            <h2 style={{ fontSize: '1rem', marginBottom: 'var(--sp-3)' }}>Progress</h2>
            <ProgressBar status={report.status} />
            <div style={{ marginTop: 'var(--sp-5)' }}>
              <TrackingStages status={report.status} entries={report.timeline} />
            </div>
          </section>

          <section className="card card-pad">
            <h2 style={{ fontSize: '1rem', marginBottom: 'var(--sp-3)' }}>Description</h2>
            <p className="small" style={{ whiteSpace: 'pre-wrap' }}>{report.description}</p>
          </section>

          <section className="card card-pad">
            <h2 style={{ fontSize: '1rem', marginBottom: 'var(--sp-3)' }}>Photos and video you sent</h2>
            <MediaGallery items={report.evidence} emptyText="No photos were attached to this report." />
          </section>

          {report.resolutionPhotos.length > 0 && (
            <section className="card card-pad">
              <h2 style={{ fontSize: '1rem', marginBottom: 'var(--sp-3)' }}>After resolution</h2>
              {report.resolution_note && (
                <p className="small muted" style={{ marginBottom: 'var(--sp-3)' }}>{report.resolution_note}</p>
              )}
              <MediaGallery items={report.resolutionPhotos} />
            </section>
          )}
        </div>

        <div className="stack">
          <section className="card card-pad">
            <h2 style={{ fontSize: '1rem', marginBottom: 'var(--sp-4)' }}>Details</h2>
            <dl className="stack-sm">
              <Detail label="Category" value={report.category_name} />
              <Detail label="Barangay" value={report.barangay} />
              <Detail label="Address / landmark" value={report.address} />
              <Detail label="Filed as" value={report.is_anonymous ? 'Anonymous' : report.reporter_name} />
              {report.assigned_at && (
                <Detail label="Assigned on" value={formatDateTime(report.assigned_at)} />
              )}
              {report.resolved_at && (
                <Detail label="Resolved on" value={formatDateTime(report.resolved_at)} />
              )}
            </dl>
          </section>

          <section className="card card-pad">
            <h2 style={{ fontSize: '1rem', marginBottom: 'var(--sp-4)' }}>Assigned personnel</h2>
            {report.staff_name ? (
              <div className="row">
                <div className="avatar green">{report.staff_name.slice(0, 1)}</div>
                <div>
                  <div className="strong">{report.staff_name}</div>
                  <div className="tiny muted">{report.staff_position || 'Field officer'}</div>
                </div>
              </div>
            ) : (
              <p className="small muted">
                No one is assigned yet. The barangay office reviews new reports before dispatching a field officer.
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="tiny muted">{label}</dt>
      <dd className="small strong" style={{ marginTop: 2 }}>{value || '—'}</dd>
    </div>
  );
}
