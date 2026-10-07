import { useCallback, useEffect, useState } from 'react';
import * as notificationService from '../services/notification.service';

/** Polls the unread notification count for the sidebar badge. */
export default function useNotificationCount(enabled = true, intervalMs = 30000) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const response = await notificationService.unreadCount();
      setCount(response.data.unread);
    } catch { /* offline or signed out — keep the previous count */ }
  }, [enabled]);

  useEffect(() => {
    refresh();
    if (!enabled) return undefined;
    const timer = setInterval(refresh, intervalMs);
    return () => clearInterval(timer);
  }, [refresh, enabled, intervalMs]);

  return { count, refresh, setCount };
}
