import { useState } from 'react';
import Icon from './Icon';
import Modal from './Modal';
import { mediaUrl } from '../utils/format';

export default function MediaGallery({ items = [], emptyText = 'No photos attached.' }) {
  const [active, setActive] = useState(null);

  if (!items.length) return <p className="small muted">{emptyText}</p>;

  return (
    <>
      <div className="media-grid">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="media-tile"
            style={{ padding: 0, cursor: 'zoom-in' }}
            onClick={() => setActive(item)}
          >
            {item.media_type === 'video' ? (
              <video src={mediaUrl(item.file_path)} muted />
            ) : (
              <img src={mediaUrl(item.file_path)} alt={item.file_name} loading="lazy" />
            )}
            {item.media_type === 'video' && (
              <span
                style={{
                  position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
                  background: 'rgba(15,27,51,.35)', color: '#fff',
                }}
              >
                <Icon name="video" size={26} />
              </span>
            )}
          </button>
        ))}
      </div>

      <Modal
        open={Boolean(active)}
        title={active?.file_name || 'Attachment'}
        size="lg"
        onClose={() => setActive(null)}
      >
        {active && (active.media_type === 'video' ? (
          <video src={mediaUrl(active.file_path)} controls style={{ width: '100%', borderRadius: 14 }} />
        ) : (
          <img
            src={mediaUrl(active.file_path)}
            alt={active.file_name}
            style={{ width: '100%', borderRadius: 14, display: 'block' }}
          />
        ))}
      </Modal>
    </>
  );
}
