import Icon from './Icon';
import { TRACKING_STAGES } from '../constants';
import { formatDateTime } from '../utils/format';

const orderOf = (status) => TRACKING_STAGES.findIndex((stage) => stage.key === status);

export function ProgressBar({ status }) {
  const index = Math.max(0, orderOf(status));
  const percent = Math.round(((index + 1) / TRACKING_STAGES.length) * 100);
  return (
    <div className="stack-sm">
      <div className="row-between">
        <span className="small strong">{TRACKING_STAGES[index]?.label}</span>
        <span className="small muted">{percent}% complete</span>
      </div>
      <div className="progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-bar" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/** The six fixed tracking stages, marked against the report's current status. */
export function TrackingStages({ status, entries = [] }) {
  const current = Math.max(0, orderOf(status));

  return (
    <div className="timeline">
      {TRACKING_STAGES.map((stage, index) => {
        const entry = entries.find((item) => item.status === stage.key);
        const done = index < current;
        const isCurrent = index === current;
        const state = done ? 'is-done' : isCurrent ? 'is-current' : '';
        return (
          <div className="timeline-item" key={stage.key}>
            <div className="timeline-rail">
              <div className={`timeline-node ${state}`}>
                {done ? <Icon name="check" size={12} strokeWidth={3} /> : <span style={{ fontSize: 9 }}>●</span>}
              </div>
              {index < TRACKING_STAGES.length - 1 && (
                <div className={`timeline-line${done ? ' is-done' : ''}`} />
              )}
            </div>
            <div className="timeline-content">
              <div className="timeline-title">{stage.label}</div>
              <div className="timeline-meta">
                {entry ? formatDateTime(entry.created_at) : stage.hint}
              </div>
              {entry?.note && <div className="small" style={{ marginTop: 4 }}>{entry.note}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Raw activity log, newest last. */
export function ActivityLog({ entries = [] }) {
  if (!entries.length) return <p className="small muted">No activity recorded yet.</p>;
  return (
    <div className="timeline">
      {entries.map((entry, index) => (
        <div className="timeline-item" key={entry.id}>
          <div className="timeline-rail">
            <div className={`timeline-node ${index === entries.length - 1 ? 'is-current' : 'is-done'}`}>
              <Icon name="check" size={12} strokeWidth={3} />
            </div>
            {index < entries.length - 1 && <div className="timeline-line is-done" />}
          </div>
          <div className="timeline-content">
            <div className="timeline-title">{entry.note || entry.status}</div>
            <div className="timeline-meta">
              {formatDateTime(entry.created_at)}
              {entry.actor_name ? ` · ${entry.actor_name}` : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
