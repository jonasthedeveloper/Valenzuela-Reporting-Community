import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import { FormMessage, TextInput } from '../../components/Field';
import * as authService from '../../services/auth.service';
import { toApiError } from '../../services/api';
import useDocumentTitle from '../../hooks/useDocumentTitle';

export default function ForgotPassword() {
  useDocumentTitle('Forgot password');

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(null);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.');

    setLoading(true);
    try {
      const response = await authService.forgotPassword(email);
      setSent(response.data || {});
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout
        title="Check your reset link"
        subtitle="If that email is registered, the link below resets the password."
        footer={<p className="small center muted"><Link to="/login">Back to sign in</Link></p>}
      >
        <div className="stack">
          <div className="form-success-summary">
            <Icon name="check-circle" size={17} style={{ marginTop: 1 }} />
            <span>
              Reset link created. It expires in {sent.expiresInMinutes || 60} minutes.
            </span>
          </div>

          {sent.resetUrl ? (
            <div className="stack-sm">
              <p className="small muted">
                No mail server is configured on this deployment, so the link is shown here instead of
                being emailed. Open it to set a new password.
              </p>
              <Link className="btn btn-primary btn-block" to={`/reset-password?token=${sent.resetToken}`}>
                Set a new password
              </Link>
              <code
                className="tiny"
                style={{
                  wordBreak: 'break-all', background: 'var(--ink-50)', padding: '10px 12px',
                  borderRadius: 10, color: 'var(--ink-600)',
                }}
              >
                {sent.resetUrl}
              </code>
            </div>
          ) : (
            <p className="small muted">
              If an account exists for {email}, a reset link is on its way. Check your spam folder too.
            </p>
          )}
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter the email on your account and we will create a reset link."
      footer={<p className="small center muted"><Link to="/login">Back to sign in</Link></p>}
    >
      <form className="stack" onSubmit={onSubmit} noValidate>
        <FormMessage>{error}</FormMessage>
        <TextInput
          label="Email address" name="email" type="email" icon="mail" required
          placeholder="you@example.com" autoComplete="email"
          value={email}
          onChange={(event) => { setEmail(event.target.value); setError(''); }}
        />
        <Button type="submit" size="lg" block loading={loading}>
          {loading ? 'Creating link…' : 'Send reset link'}
        </Button>
      </form>
    </AuthLayout>
  );
}
