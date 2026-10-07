import { useEffect } from 'react';
import Icon from './Icon';
import Button from './Button';

export default function Modal({ open, title, subtitle, onClose, children, footer, size = '' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className={`modal ${size ? `modal-${size}` : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <div className="small muted">{subtitle}</div>}
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', variant = 'danger', loading, onConfirm, onClose,
}) {
  return (
    <Modal
      open={open}
      title={title}
      size="sm"
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={variant} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      )}
    >
      <p className="muted" style={{ fontSize: '.9rem' }}>{message}</p>
    </Modal>
  );
}
