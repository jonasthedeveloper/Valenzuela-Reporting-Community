import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import Button from '../../components/Button';
import { FormMessage, PasswordInput } from '../../components/Field';
import * as authService from '../../services/auth.service';
import { toApiError } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';

export default function ResetPassword() {
  useDocumentTitle('Reset password');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const token = params.get('token') || '';
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    const next = {};
    if (form.password.length < 8) next.password = 'Use at least 8 characters.';
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      next.password = 'Mix letters and numbers.';
    }
    if (form.confirmPassword !== form.password) next.confirmPassword = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await authService.resetPassword({ token, ...form });
      toast.success('Password changed. Sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (error) {
      const apiError = toApiError(error);
      setMessage(apiError.message);
      if (apiError.errors) setErrors(apiError.errors);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout
        title="That link is incomplete"
        subtitle="The reset link is missing its token. Request a new one to continue."
        footer={<p className="small center muted"><Link to="/login">Back to sign in</Link></p>}
      >
        <Link className="btn btn-primary btn-block btn-lg" to="/forgot-password">
          Request a new link
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a password you have not used on this account before."
      footer={<p className="small center muted"><Link to="/login">Back to sign in</Link></p>}
    >
      <form className="stack" onSubmit={onSubmit} noValidate>
        <FormMessage>{message}</FormMessage>
        <PasswordInput
          label="New password" name="password" required autoComplete="new-password"
          placeholder="At least 8 characters" hint="Mix letters and numbers."
          value={form.password} onChange={update('password')} error={errors.password}
        />
        <PasswordInput
          label="Confirm new password" name="confirmPassword" required autoComplete="new-password"
          placeholder="Repeat your new password"
          value={form.confirmPassword} onChange={update('confirmPassword')} error={errors.confirmPassword}
        />
        <Button type="submit" size="lg" block loading={loading}>
          {loading ? 'Saving…' : 'Change password'}
        </Button>
      </form>
    </AuthLayout>
  );
}
