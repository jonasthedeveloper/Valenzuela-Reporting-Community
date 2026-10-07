import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import useNotificationCount from '../hooks/useNotificationCount';
import { APP_TAGLINE } from '../constants';
import { initials } from '../utils/format';

const NAV = {
  resident: [
    { section: 'Report' },
    { to: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { to: '/reports/new', label: 'Create report', icon: 'file-plus' },
    { to: '/reports', label: 'My reports', icon: 'files' },
    { section: 'Community' },
    { to: '/feed', label: 'Announcements', icon: 'megaphone' },
    { to: '/community', label: 'Community feed', icon: 'users' },
    { to: '/lost-found', label: 'Lost & found', icon: 'search' },
    { to: '/messages', label: 'Help desk', icon: 'message-circle' },
    { section: 'Account' },
    { to: '/notifications', label: 'Notifications', icon: 'bell', badge: true },
    { to: '/profile', label: 'Profile', icon: 'user' },
    { to: '/settings', label: 'Settings', icon: 'settings' },
  ],
  staff: [
    { section: 'Field work' },
    { to: '/staff/tasks', label: 'Assigned tasks', icon: 'clipboard' },
    { to: '/staff/completed', label: 'Completed', icon: 'clipboard-check' },
    { section: 'Community' },
    { to: '/feed', label: 'Announcements', icon: 'megaphone' },
    { to: '/community', label: 'Community feed', icon: 'users' },
    { to: '/messages', label: 'Help desk', icon: 'message-circle' },
    { section: 'Account' },
    { to: '/notifications', label: 'Notifications', icon: 'bell', badge: true },
    { to: '/profile', label: 'Profile', icon: 'user' },
    { to: '/settings', label: 'Settings', icon: 'settings' },
  ],
  admin: [
    { section: 'Overview' },
    { to: '/admin', label: 'Dashboard', icon: 'chart-bar', end: true },
    { to: '/admin/reports', label: 'Reports', icon: 'files' },
    { section: 'People' },
    { to: '/admin/users', label: 'Residents', icon: 'users' },
    { to: '/admin/staff', label: 'Staff', icon: 'shield' },
    { section: 'Communications' },
    { to: '/admin/announcements', label: 'Announcements', icon: 'megaphone' },
    { to: '/feed', label: 'Announcement feed', icon: 'home' },
    { to: '/community', label: 'Community feed', icon: 'users' },
    { to: '/lost-found', label: 'Lost & found', icon: 'search' },
    { to: '/messages', label: 'Help desk', icon: 'message-circle' },
    { section: 'Records' },
    { to: '/admin/export', label: 'Export data', icon: 'download' },
    { to: '/notifications', label: 'Notifications', icon: 'bell', badge: true },
    { to: '/settings', label: 'Settings', icon: 'settings' },
  ],
};

const ROLE_LABEL = { resident: 'Resident', staff: 'Field staff', admin: 'Administrator' };

export default function AppLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' && navigator.onLine === false
  );
  const menuRef = useRef(null);
  const { count } = useNotificationCount(Boolean(user));

  useEffect(() => { setSidebarOpen(false); setMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const items = NAV[user.role] || NAV.resident;

  const handleLogout = async () => {
    await logout();
    toast.success('You are signed out.');
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      {sidebarOpen && <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar${sidebarOpen ? ' is-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-mark"><Icon name="map-pin" size={20} /></span>
          <div>
            <div className="brand-name">Valenzuela CRS</div>
            <div className="brand-sub">{APP_TAGLINE}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {items.map((item, index) => (
            item.section ? (
              <div className="nav-section" key={`section-${index}`}>{item.section}</div>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
              >
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
                {item.badge && count > 0 && <span className="nav-count">{count > 99 ? '99+' : count}</span>}
              </NavLink>
            )
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="row">
            <span className={`avatar ${user.role === 'admin' ? '' : user.role === 'staff' ? 'green' : 'ink'}`}>
              {initials(user.fullName)}
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="small strong truncate">{user.fullName}</div>
              <div className="tiny muted">{ROLE_LABEL[user.role]}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button
            type="button"
            className="btn-icon mobile-toggle"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label="Toggle navigation"
          >
            <Icon name="menu" size={20} />
          </button>

          <div style={{ minWidth: 0 }}>
            <div className="topbar-title">Barangay {user.barangay}</div>
            <div className="topbar-sub hide-sm">Valenzuela City · {ROLE_LABEL[user.role]} workspace</div>
          </div>

          <div className="spacer" />

          <Link to="/notifications" className="btn-icon" aria-label="Notifications" style={{ position: 'relative' }}>
            <Icon name="bell" size={19} />
            {count > 0 && (
              <span
                className="nav-count"
                style={{ position: 'absolute', top: 2, right: 2, margin: 0, minWidth: 18, height: 18 }}
              >
                {count > 9 ? '9+' : count}
              </span>
            )}
          </Link>

          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              type="button"
              className="row"
              style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 4 }}
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="avatar avatar-sm">{initials(user.fullName)}</span>
              <Icon name="chevron-down" size={15} />
            </button>

            {menuOpen && (
              <div className="menu" role="menu">
                <div style={{ padding: '8px 11px' }}>
                  <div className="small strong">{user.fullName}</div>
                  <div className="tiny muted">{user.email}</div>
                </div>
                <div className="menu-divider" />
                <Link className="menu-item" to="/profile"><Icon name="user" size={16} /> Profile</Link>
                <Link className="menu-item" to="/settings"><Icon name="settings" size={16} /> Settings</Link>
                <div className="menu-divider" />
                <button type="button" className="menu-item danger" onClick={handleLogout}>
                  <Icon name="log-out" size={16} /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {isOffline && (
          <div className="offline-banner" role="status">
            You are currently offline. Internet connection is required for the AI Help Desk
            and submitting new reports.
          </div>
        )}

        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
