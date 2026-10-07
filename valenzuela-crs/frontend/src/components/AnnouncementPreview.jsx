import { useEffect, useState } from 'react';
import Icon from './Icon';
import Modal from './Modal';
import Button from './Button';
import * as announcementService from '../services/announcement.service';
import { formatDate, mediaUrl } from '../utils/format';

const TYPE_LABEL = {
  announcement: 'Important announcement',
  event: 'Upcoming event',
  advisory: 'Public advisory',
};

/**
 * Welcome-page announcement preview (public — uses /announcements/preview).
 * Shows the latest announcements as a compact card with a small carousel and
 * a "View Details" dialog. Hides itself when there is nothing published or the
 * request fails, so the login page never breaks.
 */
export default function AnnouncementPreview() {
  const [items, setItems] = useState(null); // null = still loading
  const [index, setIndex] = useState(0);
  const [detail, setDetail] = useState(null);
  const [heroBroken, setHeroBroken] = useState(false);

  useEffect(() => {
    let alive = true;
    announcementService.preview()
      .then((res) => { if (alive) setItems(res.data || []); })
      .catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!items || items.length < 2 || detail) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % items.length), 6000);
    return () => clearInterval(timer);
  }, [items, detail]);

  if (!items || items.length === 0) return null;

  const safeIndex = index % items.length;
  const current = items[safeIndex];
  const currentDate = current.publish_at || current.created_at;

  return (
    <>
      <aside className="auth-announce" aria-label="Latest announcements">
        {current.image_path && !heroBroken && (
          <div className="auth-announce-media">
            <img src={mediaUrl(current.image_path)} alt="" onError={() => setHeroBroken(true)} />
          </div>
        )}

        <div className="auth-announce-head">
          <span className="auth-announce-badge">
            <Icon name="megaphone" size={13} />
            {TYPE_LABEL[current.type] || 'Announcement'}
          </span>
          {items.length > 1 && (
            <span className="auth-announce-count">{safeIndex + 1} / {items.length}</span>
          )}
        </div>

        <h3 className="auth-announce-title">{current.title}</h3>
        <p className="auth-announce-excerpt">{current.body}</p>

        <div className="auth-announce-meta">
          <Icon name="calendar" size={14} />
          <span>{formatDate(currentDate)}</span>
          <span className="auth-announce-dot">·</span>
          <span>{current.author_name}</span>
        </div>

        <button type="button" className="auth-announce-link" onClick={() => setDetail(current)}>
          View Details
          <Icon name="arrow-right" size={14} />
        </button>

        {items.length > 1 && (
          <div className="auth-announce-dots" role="tablist" aria-label="Announcements">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={i === safeIndex}
                aria-label={`Announcement ${i + 1}`}
                className={`auth-announce-dot${i === safeIndex ? ' is-active' : ''}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        )}
      </aside>

      <Modal
        open={Boolean(detail)}
        title={detail?.title || ''}
        subtitle={detail ? `${TYPE_LABEL[detail.type] || 'Announcement'} · ${formatDate(detail.publish_at || detail.created_at)}` : ''}
        onClose={() => setDetail(null)}
        footer={<Button variant="secondary" onClick={() => setDetail(null)}>Close</Button>}
      >
        {detail && (
          <div className="stack">
            {detail.image_path && (
              <img
                className="announce-detail-image"
                src={mediaUrl(detail.image_path)}
                alt={detail.title}
              />
            )}
            <p className="feed-body small" style={{ whiteSpace: 'pre-wrap' }}>{detail.body}</p>
            <div className="row wrap tiny muted">
              <Icon name="user" size={14} />
              <span>{detail.author_name}</span>
              {detail.barangay && <span>· Barangay {detail.barangay}</span>}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
