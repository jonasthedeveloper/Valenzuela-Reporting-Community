import Icon from './Icon';

export default function Pagination({ meta, onChange, label = 'records' }) {
  if (!meta || meta.total === 0) return null;

  const { page, pages, total, limit } = meta;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const numbers = [];
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const end = Math.min(pages, start + 4);
  for (let i = start; i <= end; i += 1) numbers.push(i);

  return (
    <div className="pagination">
      <span className="small muted">
        Showing {from}–{to} of {total} {label}
      </span>
      <div className="pagination-pages">
        <button
          type="button" className="page-btn" disabled={page <= 1}
          onClick={() => onChange(page - 1)} aria-label="Previous page"
        >
          <Icon name="chevron-left" size={15} />
        </button>
        {start > 1 && <button type="button" className="page-btn" onClick={() => onChange(1)}>1</button>}
        {start > 2 && <span className="page-btn" style={{ border: 0, background: 'transparent' }}>…</span>}
        {numbers.map((number) => (
          <button
            key={number}
            type="button"
            className={`page-btn${number === page ? ' is-active' : ''}`}
            onClick={() => onChange(number)}
          >
            {number}
          </button>
        ))}
        {end < pages - 1 && <span className="page-btn" style={{ border: 0, background: 'transparent' }}>…</span>}
        {end < pages && <button type="button" className="page-btn" onClick={() => onChange(pages)}>{pages}</button>}
        <button
          type="button" className="page-btn" disabled={page >= pages}
          onClick={() => onChange(page + 1)} aria-label="Next page"
        >
          <Icon name="chevron-right" size={15} />
        </button>
      </div>
    </div>
  );
}
