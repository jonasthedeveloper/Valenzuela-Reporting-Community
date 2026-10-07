import { STATUS_LABELS } from '../constants';
import { titleCase } from '../utils/format';

export function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`}>
      <span className="badge-dot" />
      {STATUS_LABELS[status] || titleCase(status)}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  return <span className={`badge badge-${priority}`}>{titleCase(priority)}</span>;
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
