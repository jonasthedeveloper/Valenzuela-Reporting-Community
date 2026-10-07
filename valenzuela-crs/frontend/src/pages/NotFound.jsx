import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { homeFor } from '../components/ProtectedRoute';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Page not found');
  const { user } = useAuth();
  const target = user ? homeFor(user.role) : '/login';

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 'var(--sp-6)' }}>
      <div className="card card-pad center stack" style={{ maxWidth: 460, textAlign: 'center' }}>
        <div className="empty-icon" style={{ margin: '0 auto' }}><Icon name="alert-circle" size={26} /></div>
        <h1 style={{ fontSize: '1.3rem' }}>Page not found</h1>
        <p className="small muted">
          That page does not exist in the Valenzuela Community Reporting System.
        </p>
        <Link className="btn btn-primary" to={target}>
          <Icon name="home" size={17} /> {user ? 'Back to my dashboard' : 'Go to sign in'}
        </Link>
      </div>
    </div>
  );
}
