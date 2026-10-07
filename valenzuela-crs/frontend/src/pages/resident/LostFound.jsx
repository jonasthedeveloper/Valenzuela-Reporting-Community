import { useCallback, useEffect, useState } from 'react';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import Modal, { ConfirmDialog } from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { Badge } from '../../components/Badges';
import { EmptyState, ErrorState, Loading } from '../../components/Feedback';
import { Field, TextInput, TextArea, SelectInput, FormMessage } from '../../components/Field';
import * as lostFoundService from '../../services/lostfound.service';
import { toApiError } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatDate, mediaUrl } from '../../utils/format';
import useDebounce from '../../hooks/useDebounce';
import useDocumentTitle from '../../hooks/useDocumentTitle';

const TYPE_TABS = [
  { value: 'all', label: 'All items' },
  { value: 'lost', label: 'Lost' },
  { value: 'found', label: 'Found' },
];

const emptyForm = {
  type: 'lost', title: '', description: '', itemDate: '', location: '', contact: '',
};

export default function LostFound() {
  useDocumentTitle('Lost & found');
  const { user } = useAuth();
  const toast = useToast();

  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [postOpen, setPostOpen] = useState(false);
  const [contactItem, setContactItem] = useState(null);
  const [claimItem, setClaimItem] = useState(null);
  const [claiming, setClaiming] = useState(false);

  const debouncedSearch = useDebounce(search);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await lostFoundService.list({
        type, page, limit: 9, search: debouncedSearch || undefined,
      });
      setItems(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [type, page, debouncedSearch]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [type, debouncedSearch]);

  const confirmClaim = async () => {
    setClaiming(true);
    try {
      const response = await lostFoundService.claim(claimItem.id);
      toast.success(response.message);
      setClaimItem(null);
      load();
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Lost &amp; found</h1>
          <p className="page-sub">Post something you lost or turn in something you found in the barangay.</p>
        </div>
        <Button icon="plus" onClick={() => setPostOpen(true)}>Post an item</Button>
      </div>

      <div className="tabs">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`tab ${type === tab.value ? 'is-active' : ''}`}
            onClick={() => setType(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="filter-bar">
        <div className="input-icon search-input">
          <Icon name="search" size={17} />
          <input
            className="input"
            placeholder="Search items, description or location"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <Loading label="Loading items…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="package"
            title="No items posted"
            text="Nothing matches this view yet. Post an item to help a neighbour find it."
            action="Post an item"
            actionIcon="plus"
            onAction={() => setPostOpen(true)}
          />
        </div>
      ) : (
        <>
          <div className="grid-cards">
            {items.map((item) => (
              <article className="card lf-card" key={item.id}>
                <div className="lf-photo">
                  {item.photo_path ? (
                    <img src={mediaUrl(item.photo_path)} alt={item.title} loading="lazy" />
                  ) : (
                    <div className="lf-photo-empty"><Icon name="image" size={28} /></div>
                  )}
                </div>
                <div className="lf-body">
                  <div className="row" style={{ gap: 8 }}>
                    <span className={`badge badge-${item.type}`}>{item.type}</span>
                    <span className={`badge badge-${item.status}`}>{item.status}</span>
                  </div>
                  <h2 style={{ fontSize: '1rem' }}>{item.title}</h2>
                  <p className="small muted" style={{
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {item.description}
                  </p>
                  <div className="tiny muted">
                    <Icon name="map-pin" size={13} /> {item.location}
                  </div>
                  <div className="tiny muted">
                    <Icon name="calendar" size={13} /> {formatDate(item.item_date)} · posted by {item.poster_name}
                  </div>
                  <div className="row" style={{ marginTop: 'auto', paddingTop: 'var(--sp-3)' }}>
                    <Button size="sm" variant="secondary" icon="phone" onClick={() => setContactItem(item)}>
                      Contact
                    </Button>
                    {item.status === 'open' && item.user_id !== user.id && (
                      <Button size="sm" variant="success" icon="check" onClick={() => setClaimItem(item)}>
                        Claim
                      </Button>
                    )}
                    {item.status === 'claimed' && (
                      <Badge tone="resolved">Claimed by {item.claimer_name}</Badge>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <Pagination meta={meta} onChange={setPage} label="items" />
        </>
      )}

      <PostItemModal
        open={postOpen}
        onClose={() => setPostOpen(false)}
        onPosted={() => { setPostOpen(false); setPage(1); load(); }}
      />

      <Modal
        open={Boolean(contactItem)}
        title="Contact the poster"
        subtitle={contactItem?.title}
        size="sm"
        onClose={() => setContactItem(null)}
        footer={<Button variant="secondary" onClick={() => setContactItem(null)}>Close</Button>}
      >
        {contactItem && (
          <div className="stack-sm">
            <div>
              <div className="tiny muted">Name</div>
              <div className="strong">{contactItem.poster_name}</div>
            </div>
            <div>
              <div className="tiny muted">Barangay</div>
              <div className="strong">{contactItem.poster_barangay}</div>
            </div>
            <div>
              <div className="tiny muted">Contact number</div>
              <div className="strong">{contactItem.contact || contactItem.poster_phone || 'Not provided'}</div>
            </div>
            <div>
              <div className="tiny muted">Email</div>
              <div className="strong">{contactItem.poster_email}</div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(claimItem)}
        title="Claim this item?"
        message={`The poster of "${claimItem?.title || ''}" will be notified so you can arrange the hand-over at the barangay hall.`}
        confirmLabel="Send claim"
        variant="success"
        loading={claiming}
        onConfirm={confirmClaim}
        onClose={() => setClaimItem(null)}
      />
    </>
  );
}

function PostItemModal({ open, onClose, onPosted }) {
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setPhoto(null);
      setPreview('');
      setErrors({});
      setMessage('');
    }
  }, [open]);

  const setField = (name) => (event) => {
    setForm((current) => ({ ...current, [name]: event.target.value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const onPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage('Use a JPG, PNG or WebP photo.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setMessage('Photos must be 8 MB or smaller.');
      return;
    }
    setMessage('');
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const next = {};
    if (form.title.trim().length < 3) next.title = 'Name the item.';
    if (form.description.trim().length < 10) next.description = 'Describe the item in at least 10 characters.';
    if (!form.itemDate) next.itemDate = 'Pick the date it was lost or found.';
    if (form.location.trim().length < 3) next.location = 'Where was it lost or found?';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    if (!validate()) return;

    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, value));
    if (photo) payload.append('photo', photo);

    setSaving(true);
    try {
      const response = await lostFoundService.create(payload);
      toast.success(response.message);
      onPosted();
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
      title="Post an item"
      subtitle="Share enough detail that the owner recognises it."
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon="upload-cloud" loading={saving} onClick={submit}>Post item</Button>
        </>
      )}
    >
      <form className="stack" onSubmit={submit}>
        {message && <FormMessage>{message}</FormMessage>}

        <SelectInput
          label="Type"
          name="type"
          required
          value={form.type}
          onChange={setField('type')}
          options={[{ value: 'lost', label: 'I lost this' }, { value: 'found', label: 'I found this' }]}
        />
        <TextInput
          label="Item name"
          name="title"
          required
          placeholder="e.g. Black wallet with school ID"
          value={form.title}
          error={errors.title}
          onChange={setField('title')}
        />
        <TextArea
          label="Description"
          name="description"
          required
          rows={4}
          placeholder="Colour, brand, marks, what was inside…"
          value={form.description}
          error={errors.description}
          onChange={setField('description')}
        />
        <div className="grid grid-2">
          <TextInput
            label="Date lost or found"
            name="itemDate"
            type="date"
            required
            value={form.itemDate}
            error={errors.itemDate}
            onChange={setField('itemDate')}
          />
          <TextInput
            label="Contact number"
            name="contact"
            placeholder="09171234567"
            hint="Leave blank to use your profile number."
            value={form.contact}
            error={errors.contact}
            onChange={setField('contact')}
          />
        </div>
        <TextInput
          label="Location"
          name="location"
          required
          placeholder="e.g. Near Ugong Barangay Hall"
          value={form.location}
          error={errors.location}
          onChange={setField('location')}
        />

        <Field label="Photo" hint="Optional, but it makes the item much easier to identify.">
          <label className="dropzone" style={{ cursor: 'pointer', display: 'block' }}>
            <input type="file" accept="image/*" hidden onChange={onPhoto} />
            {preview ? (
              <img src={preview} alt="Preview" style={{ maxHeight: 160, borderRadius: 12 }} />
            ) : (
              <div className="stack-sm center">
                <Icon name="camera" size={24} />
                <span className="small">Click to attach a photo</span>
              </div>
            )}
          </label>
        </Field>
      </form>
    </Modal>
  );
}
