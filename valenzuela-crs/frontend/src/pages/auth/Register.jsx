import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import Button from '../../components/Button';
import { FormMessage, PasswordInput, SelectInput, TextInput } from '../../components/Field';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { toApiError } from '../../services/api';
import { BARANGAYS } from '../../constants';
import useDocumentTitle from '../../hooks/useDocumentTitle';

const BARANGAY_OPTIONS = BARANGAYS.map((name) => ({ value: name, label: `Barangay ${name}` }));

export default function Register() {
  useDocumentTitle('Create account');
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', barangay: '',
    address: '', password: '', confirmPassword: '', agree: false,
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (form.firstName.trim().length < 2) next.firstName = 'Enter your first name.';
    if (form.lastName.trim().length < 2) next.lastName = 'Enter your last name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address.';
    if (form.phone && !/^(09|\+639)\d{9}$/.test(form.phone)) {
      next.phone = 'Use a Philippine mobile number, e.g. 09171234567.';
    }
    if (!BARANGAYS.includes(form.barangay)) {
      next.barangay = 'Choose Barangay Ugong or Barangay Gen. T. De Leon.';
    }
    if (form.password.length < 8) next.password = 'Use at least 8 characters.';
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      next.password = 'Mix letters and numbers.';
    }
    if (form.confirmPassword !== form.password) next.confirmPassword = 'Passwords do not match.';
    if (!form.agree) next.agree = 'Confirm that your details are accurate.';
    return next;
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      const user = await register(form);
      toast.success(`Account created. Welcome, ${user.firstName}.`);
      navigate('/dashboard', { replace: true });
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
      wide
      title="Create your account"
      subtitle="Open to residents of Barangay Ugong and Barangay Gen. T. De Leon. You can sign in right away — no verification code."
      footer={(
        <p className="small center muted">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      )}
    >
      <form className="stack" onSubmit={onSubmit} noValidate>
        <FormMessage>{message}</FormMessage>

        <div className="grid grid-2">
          <TextInput
            label="First name" name="firstName" required placeholder="Ana"
            value={form.firstName} onChange={update('firstName')} error={errors.firstName}
          />
          <TextInput
            label="Last name" name="lastName" required placeholder="Reyes"
            value={form.lastName} onChange={update('lastName')} error={errors.lastName}
          />
        </div>

        <TextInput
          label="Email address" name="email" type="email" required icon="mail"
          placeholder="you@example.com" autoComplete="email"
          value={form.email} onChange={update('email')} error={errors.email}
        />

        <div className="grid grid-2">
          <TextInput
            label="Mobile number" name="phone" placeholder="09171234567"
            value={form.phone} onChange={update('phone')} error={errors.phone}
            hint="Used when staff need to reach you."
          />
          <SelectInput
            label="Barangay" name="barangay" required placeholder="Select your barangay"
            options={BARANGAY_OPTIONS}
            value={form.barangay} onChange={update('barangay')} error={errors.barangay}
          />
        </div>

        <TextInput
          label="House and street" name="address" placeholder="12 Sampaguita St."
          value={form.address} onChange={update('address')} error={errors.address}
        />

        <div className="grid grid-2">
          <PasswordInput
            label="Password" name="password" required autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password} onChange={update('password')} error={errors.password}
            hint="Mix letters and numbers."
          />
          <PasswordInput
            label="Confirm password" name="confirmPassword" required autoComplete="new-password"
            placeholder="Repeat your password"
            value={form.confirmPassword} onChange={update('confirmPassword')} error={errors.confirmPassword}
          />
        </div>

        <div className="field">
          <label className="checkbox">
            <input type="checkbox" checked={form.agree} onChange={update('agree')} />
            <span className="small">
              The details above are accurate and I live in the barangay I selected.
            </span>
          </label>
          {errors.agree && <span className="field-error">{errors.agree}</span>}
        </div>

        <Button type="submit" size="lg" block loading={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
