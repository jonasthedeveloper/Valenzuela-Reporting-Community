import { useState } from 'react';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import { TextInput, TextArea, FormMessage } from '../../components/Field';
import * as userService from '../../services/user.service';
import { toApiError } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatDate, initials } from '../../utils/format';
import useDocumentTitle from '../../hooks/useDocumentTitle';

const ROLE_LABEL = { resident: 'Resident', staff: 'Field staff', admin: 'Administrator' };

export default function Profile() {
  useDocumentTitle('Profile');
  const { user, updateUser } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    phone: user.phone || '',
    address: user.address || '',
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const setField = (name) => (event) => {
    setForm((current) => ({ ...current, [name]: event.target.value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setMessage('');
  };

  const validate = () => {
    const next = {};
    if (form.firstName.trim().length < 2) next.firstName = 'Enter your first name.';
    if (form.lastName.trim().length < 2) next.lastName = 'Enter your last name.';
    if (form.phone && !/^(09|\+639)\d{9}$/.test(form.phone.trim())) {
      next.phone = 'Use a Philippine mobile number, e.g. 09171234567.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    if (!validate()) return;

    setSaving(true);
    try {
      const response = await userService.updateProfile(form);
      updateUser(response.data.user);
      toast.success(response.message);
    } catch (err) {
      const apiError = toApiError(err);
      setErrors(apiError.errors || {});
      setMessage(apiError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-sub">Keep your contact details current so field officers can reach you.</p>
        </div>
      </div>

      <div className="grid grid-split-rev">
        <section className="card card-pad">
          <div className="stack center" style={{ textAlign: 'center' }}>
            <div className="avatar avatar-lg">{initials(user.fullName)}</div>
            <div>
              <div className="strong" style={{ fontSize: '1.05rem' }}>{user.fullName}</div>
              <div className="small muted">{user.email}</div>
            </div>
            <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
              <span className="badge badge-verified">{ROLE_LABEL[user.role]}</span>
              <span className="badge badge-neutral">Barangay {user.barangay}</span>
            </div>
            <div className="tiny muted">
              <Icon name="calendar" size={13} /> Member since {formatDate(user.createdAt)}
            </div>
          </div>
        </section>

        <section className="card card-pad">
          <h2 style={{ fontSize: '1rem', marginBottom: 'var(--sp-4)' }}>Edit details</h2>
          <form className="stack" onSubmit={submit}>
            {message && <FormMessage>{message}</FormMessage>}

            <div className="grid grid-2">
              <TextInput
                label="First name" name="firstName" required
                value={form.firstName} error={errors.firstName} onChange={setField('firstName')}
              />
              <TextInput
                label="Last name" name="lastName" required
                value={form.lastName} error={errors.lastName} onChange={setField('lastName')}
              />
            </div>

            <TextInput
              label="Mobile number" name="phone" placeholder="09171234567"
              value={form.phone} error={errors.phone} onChange={setField('phone')}
            />

            <TextArea
              label="Home address" name="address" rows={3}
              hint="Street and house number inside your barangay."
              value={form.address} error={errors.address} onChange={setField('address')}
            />

            <TextInput label="Email address" name="email" value={user.email} disabled
              hint="Email cannot be changed. Contact the barangay office if it is wrong." />

            <TextInput label="Barangay" name="barangay" value={user.barangay} disabled
              hint="The system serves Barangay Ugong and Barangay Gen. T. De Leon only." />

            <div className="row">
              <Button type="submit" icon="check" loading={saving}>Save changes</Button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
