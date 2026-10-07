import Icon from './Icon';

export default function StatCard({ label, value, icon = 'files', tone = '', hint }) {
  return (
    <div className="card stat-card">
      <div className={`stat-icon ${tone}`}><Icon name={icon} size={22} /></div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {hint && <div className="tiny muted" style={{ marginTop: 4 }}>{hint}</div>}
      </div>
    </div>
  );
}
