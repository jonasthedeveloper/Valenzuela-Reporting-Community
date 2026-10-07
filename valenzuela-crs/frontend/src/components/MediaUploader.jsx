import { useRef, useState } from 'react';
import Icon from './Icon';
import { fileSize } from '../utils/format';

const MAX_FILES = 6;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export default function MediaUploader({ files, onChange, allowVideo = true, max = MAX_FILES, error }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState('');

  const accept = allowVideo ? [...IMAGE_TYPES, ...VIDEO_TYPES] : IMAGE_TYPES;

  const addFiles = (incoming) => {
    const list = Array.from(incoming);
    const rejected = list.filter((file) => !accept.includes(file.type));
    const tooBig = list.filter((file) => {
      const limitMb = file.type.startsWith('video/') ? 40 : 8;
      return file.size > limitMb * 1024 * 1024;
    });

    if (rejected.length) {
      setLocalError(allowVideo
        ? 'Only JPG, PNG, WEBP, GIF images and MP4, WEBM, MOV videos can be attached.'
        : 'Only JPG, PNG, WEBP and GIF images can be attached.');
    } else if (tooBig.length) {
      setLocalError('Images can be up to 8 MB and videos up to 40 MB.');
    } else {
      setLocalError('');
    }

    const accepted = list.filter((file) => accept.includes(file.type) && !tooBig.includes(file));
    const next = [...files, ...accepted].slice(0, max);
    if (files.length + accepted.length > max) {
      setLocalError(`You can attach up to ${max} files.`);
    }
    onChange(next);
  };

  const removeAt = (index) => onChange(files.filter((_, i) => i !== index));

  return (
    <div className="stack-sm">
      <div
        className={`dropzone${dragging ? ' is-dragging' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click(); }}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
      >
        <div className="stack-sm" style={{ alignItems: 'center' }}>
          <Icon name="upload-cloud" size={30} style={{ color: 'var(--blue-500)' }} />
          <div className="strong">Drop photos here, or click to browse</div>
          <div className="small muted">
            {allowVideo ? 'JPG, PNG, WEBP, GIF up to 8 MB · MP4, WEBM, MOV up to 40 MB' : 'JPG, PNG, WEBP, GIF up to 8 MB'}
            {` · up to ${max} files`}
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple={max > 1}
          accept={accept.join(',')}
          style={{ display: 'none' }}
          onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }}
        />
      </div>

      {(localError || error) && <span className="field-error">{localError || error}</span>}

      {files.length > 0 && (
        <div className="media-grid">
          {files.map((file, index) => {
            const url = URL.createObjectURL(file);
            const isVideo = file.type.startsWith('video/');
            return (
              <figure className="media-tile" key={`${file.name}-${index}`} style={{ margin: 0 }}>
                {isVideo ? <video src={url} muted /> : <img src={url} alt={file.name} />}
                <button
                  type="button" className="media-remove"
                  onClick={() => removeAt(index)} aria-label={`Remove ${file.name}`}
                >
                  <Icon name="x" size={13} />
                </button>
                <figcaption
                  className="tiny"
                  style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'rgba(15,27,51,.66)', color: '#fff', padding: '4px 8px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {isVideo ? '▶ ' : ''}{file.name} · {fileSize(file.size)}
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}
    </div>
  );
}
