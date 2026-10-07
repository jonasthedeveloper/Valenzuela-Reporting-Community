import { useCallback, useEffect, useState } from 'react';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import StatCard from '../../components/StatCard';
import { EmptyState, ErrorState, Loading } from '../../components/Feedback';
import { TextInput, PasswordInput, SelectInput, FormMessage } from '../../components/Field';
import * as userService from '../../services/user.service';
import { toApiError } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { BARANGAYS } from '../../constants';
import { formatHours, initials } from '../../utils/format';
import useDebounce from '../../hooks/useDebounce';
import useDocumentTitle from '../../hooks/useDocumentTitle';

const emptyForm = {
  firstName: '', lastName: '', email: '', phone: '',
  barangay: BARANGAYS[0], position: '', password: '',
};

export default function AdminStaff() {
  useDocumentTitle('Staff management');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const debouncedSearch = useDebounce(search);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await userService.listStaff({ search: debouncedSearch || undefined });
      setRows(response.data);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const totals = rows.reduce((acc, member) => ({
    active: acc.active + member.activeCases,
    completed: acc.completed + member.completedCases,
  }), { active: 0, completed: 0 });

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Staff management</h1>
          <p className="page-sub">Field officers handling reports across the two barangays.</p>
        </div>
        <Button icon="plus" onClick={() => setOpen(true)}>New staff account</Button>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 'var(--sp-6)' }}>
        <StatCard label="Field officers" value={rows.length} icon="shield" />
        <StatCard label="Active cases" value={totals.active} icon="clipboard" tone="amber" />
        <StatCard label="Completed cases" value={totals.completed} icon="check-circle" tone="green" />
      </div>

      <div className="filter-bar">
        <div className="input-icon search-input">
          <Icon name="search" size={17} />
          <input
            className="input"
            placeholder="Search staff by name or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <Loading label="Loading staff…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="shield"
            title="No staff accounts"
            text="Create a field officer account so reports can be assigned."
            action="New staff account"
            actionIcon="plus"
            onAction={() => setOpen(true)}
          />
        </div>
      ) : (
        <div className="grid grid-3">
          {rows.map((member) => (
            <article className="card card-pad stack" key={member.id}>
              <div className="row">
                <div className="avatar green">{initials(member.fullName)}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="strong truncate">{member.fullName}</div>
                  <div className="tiny muted truncate">{member.position || 'Field officer'}</div>
                </div>
                <span
                  className={`badge badge-${member.isActive ? 'resolved' : 'critical'}`}
                  style={{ marginLeft: 'auto' }}
                >
                  {member.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="tiny muted">
                <Icon name="mail" size={13} /> {member.email}
              </div>
              <div className="tiny muted">
                <Icon name="map-pin" size={13} /> Barangay {member.barangay}
              </div>

              <div className="grid grid-3" style={{ gap: 'var(--sp-3)' }}>
                <div>
                  <div className="tiny muted">Active</div>
                  <div className="strong">{member.activeCases}</div>
                </div>
                <div>
                  <div className="tiny muted">Completed</div>
                  <div className="strong">{member.completedCases}</div>
                </div>
                <div>
                  <div className="tiny muted">Avg time</div>
                  <div className="strong">{formatHours(member.avgHours)}</div>
                </div>
              </div>

              <div>
                <div className="row-between">
                  <span className="tiny muted">Performance score</span>
                  <span className="tiny strong">{member.performanceScore}%</span>
                </div>
                <div className="progress" style={{ marginTop: 4 }}>
                  <div className="progress-bar" style={{ width: `${member.performanceScore}%` }} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <NewStaffModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => { setOpen(false); load(); }}
      />
    </>
  );
}

function NewStaffModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) { setForm(emptyForm); setErrors({}); setMessage(''); }
  }, [open]);

  const setField = (name) => (event) => {
    setForm((current) => ({ ...current, [name]: event.target.value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (form.firstName.trim().length < 2) next.firstName = 'Enter a first name.';
    if (form.lastName.trim().length < 2) next.lastName = 'Enter a last name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (form.phone && !/^(09|\+639)\d{9}$/.test(form.phone.trim())) {
      next.phone = 'Use a Philippine mobile number.';
    }
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      next.password = 'Use at least 8 characters with a letter and a number.';
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
      const response = await userService.createStaff(form);
      toast.success(response.message);
      onCreated();
    } catch (err) {
      const apiError = toApiError(err);
      setErrors(apiError.errors || {});
      setMessage(apiError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="New staff account"
      subtitle="The officer can sign in immediately with these details."
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon="check" loading={saving} onClick={submit}>Create account</Button>
        </>
      )}
    >
      <form className="stack" onSubmit={submit}>
        {message && <FormMessage>{message}</FormMessage>}

        <div className="grid grid-2">
          <TextInput label="First name" name="firstName" required
            value={form.firstName} error={errors.firstName} onChange={setField('firstName')} />
          <TextInput label="Last name" name="lastName" required
            value={form.lastName} error={errors.lastName} onChange={setField('lastName')} />
        </div>

        <TextInput label="Email address" name="email" type="email" required
          value={form.email} error={errors.email} onChange={setField('email')} />

        <div className="grid grid-2">
          <TextInput label="Mobile number" name="phone" placeholder="09171234567"
            value={form.phone} error={errors.phone} onChange={setField('phone')} />
          <SelectInput label="Barangay" name="barangay" required
            value={form.barangay} error={errors.barangay} onChange={setField('barangay')}
            options={BARANGAYS.map((item) => ({ value: item, label: item }))} />
        </div>

        <TextInput label="Position" name="position" placeholder="e.g. Sanitation crew lead"
          value={form.position} error={errors.position} onChange={setField('position')} />

        <PasswordInput label="Temporary password" name="password" required
          hint="At least 8 characters with a letter and a number."
          value={form.password} error={errors.password} onChange={setField('password')} />
      </form>
    </Modal>
  );
}
