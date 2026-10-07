import Icon from './Icon';
import Button from './Button';

export function Spinner({ large = false }) {
  return <span className={`spinner${large ? ' spinner-lg' : ''}`} />;
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="loading-block">
      <Spinner large />
      <span className="small">{label}</span>
    </div>
  );
}

export function EmptyState({ icon = 'inbox', title, text, action, onAction, actionIcon }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon name={icon} size={26} /></div>
      <div className="empty-title">{title}</div>
      {text && <p className="empty-text">{text}</p>}
      {action && <Button icon={actionIcon} onClick={onAction}>{action}</Button>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="empty-state">
      <div className="empty-icon" style={{ background: 'var(--red-50)', color: 'var(--red-600)' }}>
        <Icon name="alert-triangle" size={26} />
      </div>
      <div className="empty-title">That did not load</div>
      <p className="empty-text">{message}</p>
      {onRetry && <Button variant="secondary" icon="refresh" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <div className="stack-sm" style={{ padding: 'var(--sp-5)' }}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="row" style={{ gap: 12 }}>
          {Array.from({ length: columns }).map((__, colIndex) => (
            <div
              key={colIndex}
              className="skeleton"
              style={{ height: 14, flex: colIndex === 0 ? 2 : 1 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
