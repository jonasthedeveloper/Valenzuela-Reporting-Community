import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import MediaUploader from '../../components/MediaUploader';
import { FormMessage, SelectInput, TextArea, TextInput } from '../../components/Field';
import { PriorityBadge } from '../../components/Badges';
import { Loading } from '../../components/Feedback';
import * as reportService from '../../services/report.service';
import { toApiError } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { PRIORITIES } from '../../constants';
import { fileSize } from '../../utils/format';
import useDocumentTitle from '../../hooks/useDocumentTitle';

export default function CreateReport() {
  useDocumentTitle('File a report');
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    categoryId: '', title: '', description: '', address: '',
    priority: 'medium', isAnonymous: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const response = await reportService.listCategories();
        setCategories(response.data);
      } catch (error) {
        setMessage(toApiError(error).message);
      } finally {
        setLoadingCategories(false);
      }
    })();
  }, []);

  const update = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.categoryId) next.categoryId = 'Choose the category that fits best.';
    if (form.title.trim().length < 6) next.title = 'Give the report a short title (at least 6 characters).';
    if (form.description.trim().length < 20) next.description = 'Describe what happened in at least 20 characters.';
    if (form.address.trim().length < 5) next.address = 'Enter the street address or a nearby landmark.';
    return next;
  };

  const onReview = (event) => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      setMessage('Some fields still need attention.');
      return;
    }
    setMessage('');
    setPreview(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async () => {
    setSubmitting(true);
    setMessage('');
    const payload = new FormData();
    payload.append('categoryId', form.categoryId);
    payload.append('title', form.title.trim());
    payload.append('description', form.description.trim());
    payload.append('address', form.address.trim());
    payload.append('priority', form.priority);
    payload.append('isAnonymous', String(form.isAnonymous));
    files.forEach((file) => payload.append('media', file));

    try {
      const response = await reportService.createReport(payload, (event) => {
        if (event.total) setProgress(Math.round((event.loaded / event.total) * 100));
      });
      toast.success(response.message);
      navigate(`/reports/${response.data.id}`, { replace: true });
    } catch (error) {
      const apiError = toApiError(error);
      setMessage(apiError.message);
      if (apiError.errors) setErrors(apiError.errors);
      setPreview(false);
    } finally {
      setSubmitting(false);
      setProgress(0);
    }
  };

  if (loadingCategories) return <Loading label="Loading categories…" />;

  const categoryName = categories.find((c) => String(c.id) === String(form.categoryId))?.name;

  if (preview) {
    return (
      <>
        <div className="page-head">
          <div>
            <h1 className="page-title">Review before sending</h1>
            <p className="page-sub">Check the details. You can still go back and edit anything.</p>
          </div>
        </div>

        <div className="card card-pad stack">
          <FormMessage>{message}</FormMessage>

          <div className="row wrap" style={{ gap: 8 }}>
            <span className="badge badge-verified">{categoryName}</span>
            <PriorityBadge priority={form.priority} />
            {form.isAnonymous && <span className="badge badge-neutral">Anonymous</span>}
          </div>

          <div>
            <h2>{form.title}</h2>
            <div className="small muted">
              Barangay {user.barangay} · {form.address}
            </div>
          </div>

          <p style={{ whiteSpace: 'pre-wrap' }}>{form.description}</p>

          {files.length > 0 && (
            <div className="stack-sm">
              <div className="field-label">Attachments ({files.length})</div>
              <div className="media-grid">
                {files.map((file, index) => (
                  <div className="media-tile" key={`${file.name}-${index}`}>
                    {file.type.startsWith('video/')
                      ? <video src={URL.createObjectURL(file)} muted />
                      : <img src={URL.createObjectURL(file)} alt={file.name} />}
                    <span
                      className="tiny"
                      style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'rgba(15,27,51,.66)', color: '#fff', padding: '4px 8px',
                      }}
                    >
                      {fileSize(file.size)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {submitting && progress > 0 && (
            <div className="stack-sm">
              <div className="small muted">Uploading… {progress}%</div>
              <div className="progress"><div className="progress-bar" style={{ width: `${progress}%` }} /></div>
            </div>
          )}

          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="secondary" icon="arrow-left" onClick={() => setPreview(false)} disabled={submitting}>
              Back to edit
            </Button>
            <Button icon="send" loading={submitting} onClick={onSubmit}>
              {submitting ? 'Sending…' : 'Submit report'}
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">File a report</h1>
          <p className="page-sub">
            The clearer the details, the faster the barangay can act on it.
          </p>
        </div>
      </div>

      <form className="card card-pad stack" onSubmit={onReview} noValidate>
        <FormMessage>{message}</FormMessage>

        <div className="grid grid-2">
          <SelectInput
            label="Category" name="categoryId" required placeholder="What is this about?"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            value={form.categoryId} onChange={update('categoryId')} error={errors.categoryId}
          />
          <TextInput
            label="Barangay" name="barangay" value={`Barangay ${user.barangay}`} disabled
            hint="Taken from your account."
          />
        </div>

        <TextInput
          label="Title" name="title" required
          placeholder="e.g. Deep pothole near the covered court"
          value={form.title} onChange={update('title')} error={errors.title}
        />

        <TextArea
          label="What happened?" name="description" required
          placeholder="Describe the problem, how long it has been there, and who it affects."
          value={form.description} onChange={update('description')} error={errors.description}
          hint={`${form.description.trim().length} characters — at least 20.`}
        />

        <TextInput
          label="Address or landmark" name="address" required icon="map-pin"
          placeholder="e.g. Sampaguita St., beside the covered court"
          value={form.address} onChange={update('address')} error={errors.address}
          hint="Plain text is fine. Mention a landmark if the street has no number."
        />

        <div className="field">
          <span className="field-label">How urgent is it? <span className="required">*</span></span>
          <div className="radio-cards">
            {PRIORITIES.map((priority) => (
              <label
                key={priority.value}
                className={`radio-card${form.priority === priority.value ? ' is-selected' : ''}`}
              >
                <input
                  type="radio" name="priority" value={priority.value}
                  checked={form.priority === priority.value}
                  onChange={update('priority')}
                />
                <span>
                  <span className="radio-card-title">{priority.label}</span>
                  <span className="field-hint" style={{ display: 'block' }}>{priority.hint}</span>
                </span>
              </label>
            ))}
          </div>
          <span className="field-hint">
            For a fire, a crime in progress or a medical emergency, call 911 first, then file this report.
          </span>
        </div>

        <div className="field">
          <span className="field-label">Photos and video</span>
          <MediaUploader files={files} onChange={setFiles} />
        </div>

        <label className="checkbox">
          <input type="checkbox" checked={form.isAnonymous} onChange={update('isAnonymous')} />
          <span className="small">
            Submit anonymously — your name stays hidden from other residents. Barangay staff still see it
            so they can follow up with you.
          </span>
        </label>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>Cancel</Button>
          <Button type="submit" icon="eye">Preview report</Button>
        </div>
      </form>
    </>
  );
}
