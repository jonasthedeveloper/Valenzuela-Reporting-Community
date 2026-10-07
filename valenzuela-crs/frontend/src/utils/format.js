import { apiOrigin } from '../services/api';

const LOCALE = 'en-PH';

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString(LOCALE, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString(LOCALE, {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    })
    : '—';

export const formatTime = (value) =>
  value ? new Date(value).toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' }) : '';

export const timeAgo = (value) => {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
};

export const formatHours = (hours) => {
  if (hours === null || hours === undefined || Number.isNaN(Number(hours))) return '—';
  const value = Number(hours);
  if (value < 24) return `${value.toFixed(1)} hrs`;
  return `${(value / 24).toFixed(1)} days`;
};

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';

export const titleCase = (value = '') => value.charAt(0).toUpperCase() + value.slice(1);

export const fileSize = (bytes) => {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

/**
 * Turns a stored /uploads path into a full URL for the browser.
 * Uses the API origin resolved by services/api.js, so photos still load when
 * the app is opened from 127.0.0.1 or a LAN/phone address instead of localhost.
 */
export const mediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${apiOrigin}${path}`;
};
