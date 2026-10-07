import { useState } from 'react';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import { ConfirmDialog } from '../../components/Modal';
import { PasswordInput, FormMessage } from '../../components/Field';
import * as authService from '../../services/auth.service';
import { toApiError } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';

export default function Settings() {
  useDocumentTitle('Settings');
  const { user, updateUser, logoutEverywhere } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const [twoFactorSaving, setTwoFactorSaving] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const setField = (name) => (event) => {
    setForm((current) => ({ ...current, [name]: event.target.value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setMessage('');
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.currentPassword) next.currentPassword = 'Enter your current password.';
    if (form.newPassword.length < 8) next.newPassword = 'Use at least 8 characters.';
    else if (!/[A-Za-z]/.test(form.newPassword) || !/\d/.test(form.newPassword)) {
      next.newPassword = 'Include at least one letter and one number.';
    }
    if (form.newPassword !== form.confirmPassword) next.confirmPassword = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    setMessage('');
    try {
      const response = await authService.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success(response.message || 'Password updated.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const apiError = toApiError(err);
      setErrors(apiError.errors || {});
      setMessage(apiError.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleTwoFactor = async () => {
    setTwoFactorSaving(true);
    try {
      const response = await authService.setTwoFactor(!user.twoFactorEnabled);
      updateUser(response.data.user);
      toast.success(response.message);
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setTwoFactorSaving(false);
    }
  };

  const confirmLogoutAll = async () => {
    setLoggingOut(true);
    try {
      await logoutEverywhere();
    } catch (err) {
      toast.error(toApiError(err).message);
      setLoggingOut(false);
      setConfirmLogout(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Security options for your account.</p>
        </div>
      </div>

      <div className="stack" style={{ maxWidth: 720 }}>
        <section className="card card-pad">
          <div className="row" style={{ marginBottom: 'var(--sp-4)' }}>
            <div className="stat-icon"><Icon name="lock" size={19} /></div>
            <div>
              <h2 style={{ fontSize: '1rem' }}>Password management</h2>
              <p className="small muted">Change the password you use to sign in.</p>
            </div>
          </div>

          <form className="stack" onSubmit={submitPassword}>
            {message && <FormMessage>{message}</FormMessage>}
            <PasswordInput
              label="Current password" name="currentPassword" required autoComplete="current-password"
              value={form.currentPassword} error={errors.currentPassword} onChange={setField('currentPassword')}
            />
            <div className="grid grid-2">
              <PasswordInput
                label="New password" name="newPassword" required autoComplete="new-password"
                hint="At least 8 characters with a letter and a number."
                value={form.newPassword} error={errors.newPassword} onChange={setField('newPassword')}
              />
              <PasswordInput
                label="Confirm new password" name="confirmPassword" required autoComplete="new-password"
                value={form.confirmPassword} error={errors.confirmPassword} onChange={setField('confirmPassword')}
              />
            </div>
            <div className="row">
              <Button type="submit" icon="check" loading={saving}>Update password</Button>
            </div>
          </form>
        </section>

        <section className="card card-pad">
          <div className="row-between wrap">
            <div className="row">
              <div className={`stat-icon ${user.twoFactorEnabled ? 'green' : ''}`}>
                <Icon name="shield-check" size={19} />
              </div>
              <div>
                <h2 style={{ fontSize: '1rem' }}>Two-factor authentication</h2>
                <p className="small muted" style={{ maxWidth: 420 }}>
                  When enabled, this account is flagged for an extra verification step by the barangay IT desk
                  before any password reset is honoured.
                </p>
                <span className={`badge badge-${user.twoFactorEnabled ? 'resolved' : 'neutral'}`} style={{ marginTop: 8 }}>
                  {user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
            <Button
              variant={user.twoFactorEnabled ? 'secondary' : 'primary'}
              loading={twoFactorSaving}
              onClick={toggleTwoFactor}
            >
              {user.twoFactorEnabled ? 'Turn off' : 'Turn on'}
            </Button>
          </div>
        </section>

        <section className="card card-pad">
          <div className="row-between wrap">
            <div className="row">
              <div className="stat-icon red"><Icon name="log-out" size={19} /></div>
              <div>
                <h2 style={{ fontSize: '1rem' }}>Log out of all devices</h2>
                <p className="small muted" style={{ maxWidth: 420 }}>
                  Ends every active session, including this one. Use it if you signed in on a shared computer.
                </p>
              </div>
            </div>
            <Button variant="danger" icon="log-out" onClick={() => setConfirmLogout(true)}>
              Log out everywhere
            </Button>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Log out of all devices?"
        message="You will be signed out here too and will need to log in again."
        confirmLabel="Log out everywhere"
        loading={loggingOut}
        onConfirm={confirmLogoutAll}
        onClose={() => setConfirmLogout(false)}
      />
    </>
  );
}
