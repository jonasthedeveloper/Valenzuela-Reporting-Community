import { useCallback, useEffect, useState } from 'react';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import Modal, { ConfirmDialog } from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/Feedback';
import { TextInput, TextArea, SelectInput, FormMessage, Field } from '../../components/Field';
import PostAs from '../../components/PostAs';
import * as announcementService from '../../services/announcement.service';
import { toApiError } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { ANNOUNCEMENT_TYPES, BARANGAYS } from '../../constants';
import { formatDateTime, mediaUrl } from '../../utils/format';
import useDebounce from '../../hooks/useDebounce';
import useDocumentTitle from '../../hooks/useDocumentTitle';

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'scheduled', label: 'Scheduled' },
];

const emptyForm = {
  title: '', body: '', type: 'announcement', status: 'draft', barangay: '', publishAt: '',
};

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const IMAGE_MAX_MB = 8;

export default function AdminAnnouncements() {
  useDocumentTitle('Announcements');
  const toast = useToast();

  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const debouncedSearch = useDebounce(search);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await announcementService.listAll({
        status, page, limit: 10, search: debouncedSearch || undefined,
      });
      setRows(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [status, page, debouncedSearch]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status, debouncedSearch]);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (item) => { setEditing(item); setFormOpen(true); };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const response = await announcementService.remove(deleteTarget.id);
      toast.success(response.message);
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-sub">Publish notices, events and advisories to the community feed.</p>
        </div>
        <Button icon="plus" onClick={openNew}>New announcement</Button>
      </div>

      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`tab ${status === tab.value ? 'is-active' : ''}`}
            onClick={() => setStatus(tab.value)}
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
            placeholder="Search announcements"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <section className="card">
        {loading ? (
          <div style={{ padding: 'var(--sp-5)' }}><TableSkeleton rows={6} columns={6} /></div>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="megaphone"
            title="Nothing here yet"
            text="Write an announcement to reach every resident in the feed."
            action="New announcement"
            actionIcon="plus"
            onAction={openNew}
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Type</th>
                    <th>Audience</th>
                    <th>Status</th>
                    <th>Engagement</th>
                    <th>Publish date</th>
                    <th className="right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="strong truncate" style={{ maxWidth: 260 }}>{item.title}</div>
                        <div className="tiny muted truncate" style={{ maxWidth: 260 }}>
                          {item.image_path && <span className="nowrap">🖼 image · </span>}{item.body}
                        </div>
                      </td>
                      <td className="small nowrap">
                        {item.author_real_name || 'Barangay office'}
                        {Number(item.is_anonymous) === 1 && (
                          <span className="tiny muted block">posted as Anonymous</span>
                        )}
                      </td>
                      <td className="nowrap">{item.type}</td>
                      <td className="nowrap small">{item.barangay ? `Barangay ${item.barangay}` : 'City-wide'}</td>
                      <td><span className={`badge badge-${item.status}`}>{item.status}</span></td>
                      <td className="nowrap small muted">
                        {Number(item.like_count)} likes · {Number(item.comment_count)} comments
                      </td>
                      <td className="nowrap small muted">
                        {formatDateTime(item.publish_at || item.created_at)}
                      </td>
                      <td className="cell-actions">
                        <Button size="sm" variant="secondary" icon="edit" onClick={() => openEdit(item)}>
                          Edit
                        </Button>
                        <button
                          type="button"
                          className="btn-icon"
                          title="Delete announcement"
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={meta} onChange={setPage} label="announcements" />
          </>
        )}
      </section>

      <AnnouncementForm
        open={formOpen}
        record={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); load(); }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this announcement?"
        message={`"${deleteTarget?.title || ''}" will be removed from the community feed.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}

const toLocalInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

function AnnouncementForm({ open, record, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [removeImage, setRemoveImage] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setMessage('');
    setIsAnonymous(record ? Number(record.is_anonymous) === 1 : false);
    setImageFile(null);
    setRemoveImage(false);
    setImagePreview(record?.image_path ? mediaUrl(record.image_path) : '');
    setForm(record ? {
      title: record.title,
      body: record.body,
      type: record.type,
      status: record.status,
      barangay: record.barangay || '',
      publishAt: toLocalInput(record.publish_at),
    } : emptyForm);
  }, [open, record]);

  const setField = (name) => (event) => {
    setForm((current) => ({ ...current, [name]: event.target.value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const onImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      setMessage('Use a JPG, PNG, WEBP or GIF image.');
      return;
    }
    if (file.size > IMAGE_MAX_MB * 1024 * 1024) {
      setMessage(`Images must be ${IMAGE_MAX_MB} MB or smaller.`);
      return;
    }
    setMessage('');
    setErrors((current) => ({ ...current, image: undefined }));
    setImageFile(file);
    setRemoveImage(false);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview('');
    setRemoveImage(Boolean(record?.image_path));
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');

    const next = {};
    if (form.title.trim().length < 6) next.title = 'Give the announcement a title of at least 6 characters.';
    if (form.body.trim().length < 20) next.body = 'Write at least 20 characters.';
    if (form.status === 'scheduled' && !form.publishAt) next.publishAt = 'Pick when it should go live.';
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = new FormData();
    payload.append('title', form.title.trim());
    payload.append('body', form.body.trim());
    payload.append('type', form.type);
    payload.append('status', form.status);
    payload.append('barangay', form.barangay || '');
    payload.append('publishAt', form.publishAt ? form.publishAt.replace('T', ' ') + ':00' : '');
    payload.append('isAnonymous', String(isAnonymous));
    if (imageFile) payload.append('image', imageFile);
    if (removeImage) payload.append('removeImage', 'true');

    setSaving(true);
    try {
      const response = record
        ? await announcementService.update(record.id, payload)
        : await announcementService.create(payload);
      toast.success(response.message);
      onSaved();
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
      title={record ? 'Edit announcement' : 'New announcement'}
      subtitle="Drafts stay hidden. Published posts appear in the feed straight away."
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon="megaphone" loading={saving} onClick={submit}>
            {form.status === 'published' ? 'Publish' : 'Save'}
          </Button>
        </>
      )}
    >
      <form className="stack" onSubmit={submit}>
        {message && <FormMessage>{message}</FormMessage>}

        <TextInput label="Title" name="title" required
          value={form.title} error={errors.title} onChange={setField('title')} />

        <TextArea label="Body" name="body" rows={6} required
          placeholder="What do residents need to know?"
          value={form.body} error={errors.body} onChange={setField('body')} />

        <div className="grid grid-2">
          <PostAs
            value={isAnonymous}
            onChange={setIsAnonymous}
            label="Post as"
            noun="This announcement"
            hint="Anonymous hides the public name only — your account stays on record for the barangay."
          />
          <Field
            label="Image"
            hint="Optional. JPG, PNG, WEBP or GIF up to 8 MB."
            error={errors.image}
          >
            {imagePreview ? (
              <div className="image-pick">
                <img src={imagePreview} alt="Announcement preview" className="image-pick-thumb" />
                <div className="image-pick-actions">
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                    Replace
                    <input type="file" accept={IMAGE_TYPES.join(',')} hidden onChange={onImage} />
                  </label>
                  <Button type="button" size="sm" variant="ghost" icon="trash" onClick={clearImage}>
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <label className="dropzone" style={{ cursor: 'pointer', display: 'block' }}>
                <input type="file" accept={IMAGE_TYPES.join(',')} hidden onChange={onImage} />
                <div className="stack-sm" style={{ alignItems: 'center' }}>
                  <Icon name="image" size={26} style={{ color: 'var(--blue-500)' }} />
                  <div className="strong">Add an image</div>
                  <div className="small muted">Click to browse · JPG, PNG, WEBP, GIF up to 8 MB</div>
                </div>
              </label>
            )}
          </Field>
        </div>

        <div className="grid grid-2">
          <SelectInput label="Type" name="type" required
            value={form.type} onChange={setField('type')} options={ANNOUNCEMENT_TYPES} />
          <SelectInput label="Status" name="status" required
            value={form.status} onChange={setField('status')}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'published', label: 'Published' },
              { value: 'scheduled', label: 'Scheduled' },
            ]} />
        </div>

        <div className="grid grid-2">
          <SelectInput label="Audience" name="barangay"
            value={form.barangay} onChange={setField('barangay')}
            placeholder="City-wide (both barangays)"
            options={BARANGAYS.map((item) => ({ value: item, label: `Barangay ${item}` }))} />
          <TextInput label="Publish date and time" name="publishAt" type="datetime-local"
            hint="Required for scheduled posts."
            value={form.publishAt} error={errors.publishAt} onChange={setField('publishAt')} />
        </div>
      </form>
    </Modal>
  );
}
