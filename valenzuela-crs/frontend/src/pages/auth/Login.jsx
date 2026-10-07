import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import Button from '../../components/Button';
import { FormMessage, PasswordInput, TextInput } from '../../components/Field';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { toApiError } from '../../services/api';
import { homeFor } from '../../components/ProtectedRoute';
import useDocumentTitle from '../../hooks/useDocumentTitle';

export default function Login() {
  useDocumentTitle('Sign in');
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '', rememberMe: false });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setErrors({});

    const nextErrors = {};
    if (!form.email.trim()) nextErrors.email = 'Enter your email address.';
    if (!form.password) nextErrors.password = 'Enter your password.';
    if (Object.keys(nextErrors).length) return setErrors(nextErrors);

    setLoading(true);
    try {
      const user = await login(form);
      toast.success(`Welcome back, ${user.firstName}.`);
      navigate(location.state?.from || homeFor(user.role), { replace: true });
    } catch (error) {
      const apiError = toApiError(error);
      setMessage(apiError.message);
      if (apiError.errors) setErrors(apiError.errors);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Use the email you registered with the barangay."
      footer={(
        <p className="small center muted">
          No account yet? <Link to="/register">Create one</Link>
        </p>
      )}
    >
      <form className="stack" onSubmit={onSubmit} noValidate>
        <FormMessage>{message}</FormMessage>

        <TextInput
          label="Email address" name="email" type="email" icon="mail"
          placeholder="you@example.com" autoComplete="email"
          value={form.email} onChange={update('email')} error={errors.email}
        />

        <PasswordInput
          label="Password" name="password" placeholder="Your password"
          autoComplete="current-password"
          value={form.password} onChange={update('password')} error={errors.password}
        />

        <div className="row-between">
          <label className="checkbox">
            <input type="checkbox" checked={form.rememberMe} onChange={update('rememberMe')} />
            <span>Keep me signed in</span>
          </label>
          <Link to="/forgot-password" className="small">Forgot password?</Link>
        </div>

        <Button type="submit" size="lg" block loading={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="auth-divider" style={{ margin: 'var(--sp-5) 0 var(--sp-3)' }}>Test accounts</div>
      <div className="stack-sm tiny muted">
        <span>Resident — resident@example.com · Resident@123</span>
        <span>Staff — staff@valenzuela.gov.ph · Staff@123</span>
        <span>Admin — admin@valenzuela.gov.ph · Admin@123</span>
      </div>
    </AuthLayout>
  );
}
