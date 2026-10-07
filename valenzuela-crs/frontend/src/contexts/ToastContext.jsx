import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Icon from '../components/Icon';

const ToastContext = createContext(null);

let counter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type, message, title) => {
    counter += 1;
    const id = counter;
    setToasts((current) => [...current, { id, type, message, title }]);
    setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);

  const value = useMemo(() => ({
    success: (message, title = 'Done') => push('success', message, title),
    error: (message, title = 'Something went wrong') => push('error', message, title),
    info: (message, title = 'Heads up') => push('info', message, title),
  }), [push]);

  const iconFor = { success: 'check-circle', error: 'alert-circle', info: 'info' };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <Icon
              name={iconFor[toast.type]}
              size={18}
              style={{ flex: 'none', marginTop: 2 }}
              className={toast.type === 'success' ? 'text-green' : ''}
            />
            <div style={{ flex: 1 }}>
              <div className="toast-title">{toast.title}</div>
              <div className="toast-body">{toast.message}</div>
            </div>
            <button type="button" className="btn-icon" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
};
