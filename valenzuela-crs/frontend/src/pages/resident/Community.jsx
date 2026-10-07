import { useCallback, useEffect, useState } from 'react';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import Modal, { ConfirmDialog } from '../../components/Modal';
import Pagination from '../../components/Pagination';
import PostAs from '../../components/PostAs';
import { EmptyState, ErrorState, Loading, Spinner } from '../../components/Feedback';
import { TextArea, SelectInput, FormMessage, Field } from '../../components/Field';
import { AuthorAvatar } from './Feed';
import * as communityService from '../../services/community.service';
import { toApiError } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatDateTime, timeAgo, mediaUrl } from '../../utils/format';
import useDocumentTitle from '../../hooks/useDocumentTitle';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'general', label: 'General' },
  { value: 'question', label: 'Questions' },
  { value: 'suggestion', label: 'Suggestions' },
  { value: 'lost-found', label: 'Lost & found' },
  { value: 'event', label: 'Events' },
  { value: 'reminder', label: 'Reminders' },
];

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));
const CATEGORY_BADGE = {
  question: 'verified',
  suggestion: 'verified',
  'lost-found': 'high',
  event: 'resolved',
  reminder: 'pending',
  general: 'neutral',
};

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const IMAGE_MAX_MB = 8;

export default function Community() {
  useDocumentTitle('Community feed');
  const toast = useToast();
  const { user } = useAuth();

  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { kind, id, label }
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await communityService.list({ category, page, limit: 8 });
      setPosts(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [category, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [category]);

  const handleLike = async (post) => {
    const liked = Number(post.liked_by_me) > 0;
    setPosts((current) => current.map((item) => (item.id === post.id
      ? { ...item, liked_by_me: liked ? 0 : 1, like_count: Number(item.like_count) + (liked ? -1 : 1) }
      : item)));
    try {
      const response = await communityService.toggleLike(post.id);
      setPosts((current) => current.map((item) => (item.id === post.id
        ? { ...item, liked_by_me: response.data.liked ? 1 : 0, like_count: response.data.likeCount }
        : item)));
    } catch (err) {
      toast.error(toApiError(err).message);
      load();
    }
  };

  const canDelete = (item) => item.is_mine || user?.role === 'admin';

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const response = confirmTarget.kind === 'post'
        ? await communityService.remove(confirmTarget.id)
        : await communityService.removeComment(confirmTarget.id);
      toast.success(response.message);
      setConfirmTarget(null);
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
          <h1 className="page-title">Community feed</h1>
          <p className="page-sub">Ask, share and help out your neighbors across the barangay.</p>
        </div>
        <Button icon="plus" onClick={() => setFormOpen(true)}>Create post</Button>
      </div>

      {/* Composer teaser — the quick way to start a post */}
      <div className="card cf-composer" role="button" tabIndex={0}
        onClick={() => setFormOpen(true)}
        onKeyDown={(event) => { if (event.key === 'Enter') setFormOpen(true); }}
      >
        <AuthorAvatar name={user?.fullName || ''} />
        <span className="cf-composer-input">What&rsquo;s happening in your community?</span>
        <span className="cf-composer-action"><Icon name="image" size={17} /> Photo</span>
        <Button size="sm" icon="plus" onClick={(event) => { event.stopPropagation(); setFormOpen(true); }}>
          Post
        </Button>
      </div>

      <div className="tabs">
        {CATEGORIES.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`tab ${category === item.value ? 'is-active' : ''}`}
            onClick={() => setCategory(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading label="Loading the community feed…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : posts.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="users"
            title="No posts here yet"
            text="Be the first to share something with your community."
            action="Create post"
            actionIcon="plus"
            onAction={() => setFormOpen(true)}
          />
        </div>
      ) : (
        <div className="stack">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={() => handleLike(post)}
              canDelete={canDelete(post)}
              onDelete={() => setConfirmTarget({ kind: 'post', id: post.id, label: 'this post' })}
            />
          ))}
          <Pagination meta={meta} onChange={setPage} label="posts" />
        </div>
      )}

      <CreatePostModal open={formOpen} onClose={() => setFormOpen(false)} onCreated={() => {
        setFormOpen(false);
        setPage(1);
        if (page === 1) load();
      }} />

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title={confirmTarget?.kind === 'post' ? 'Delete this post?' : 'Delete this comment?'}
        message={`${confirmTarget?.kind === 'post' ? 'This post' : 'This comment'} will be removed from the community feed.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setConfirmTarget(null)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ post */

function PostCard({ post, onLike, canDelete, onDelete }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [count, setCount] = useState(Number(post.comment_count));
  const [commentDraft, setCommentDraft] = useState('');
  const [commentAsAnonymous, setCommentAsAnonymous] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // comment id being replied to
  const [replyDraft, setReplyDraft] = useState('');
  const [replyAsAnonymous, setReplyAsAnonymous] = useState(false);
  const [sending, setSending] = useState(false);

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const response = await communityService.comments(post.id);
      setComments(response.data);
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setLoadingComments(false);
    }
  };

  const toggleComments = async () => {
    const next = !open;
    setOpen(next);
    if (next && comments.length === 0) await loadComments();
  };

  const submitComment = async (event) => {
    event.preventDefault();
    const body = commentDraft.trim();
    if (body.length < 2) return toast.error('Write a comment first.');
    setSending(true);
    try {
      const response = await communityService.addComment(post.id, {
        body, isAnonymous: commentAsAnonymous,
      });
      setComments((current) => [...current, response.data]);
      setCount((value) => value + 1);
      setCommentDraft('');
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setSending(false);
    }
  };

  const submitReply = async (event) => {
    event.preventDefault();
    const body = replyDraft.trim();
    if (body.length < 2 || !replyTo) return toast.error('Write a reply first.');
    setSending(true);
    try {
      const response = await communityService.addReply(replyTo, {
        body, isAnonymous: replyAsAnonymous,
      });
      setComments((current) => [...current, response]);
      setCount((value) => value + 1);
      setReplyDraft('');
      setReplyTo(null);
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setSending(false);
    }
  };

  const roots = comments.filter((comment) => !comment.parent_id);
  const repliesOf = (id) => comments.filter((comment) => comment.parent_id === id);
  const liked = Number(post.liked_by_me) > 0;
  const likeCount = Number(post.like_count);

  return (
    <article className="card feed-post">
      <div className="row" style={{ marginBottom: 'var(--sp-3)' }}>
        <AuthorAvatar name={post.author_name} />
        <div style={{ minWidth: 0 }}>
          <div className="strong truncate">{post.author_name}</div>
          <div className="tiny muted">{timeAgo(post.created_at)}</div>
        </div>
        <span className={`badge badge-${CATEGORY_BADGE[post.category] || 'neutral'}`} style={{ marginLeft: 'auto' }}>
          {CATEGORY_LABEL[post.category] || 'General'}
        </span>
        {canDelete && (
          <button type="button" className="btn-icon" title="Delete post" onClick={onDelete}>
            <Icon name="trash" size={15} />
          </button>
        )}
      </div>

      <p className="feed-body small" style={{ whiteSpace: 'pre-wrap' }}>{post.body}</p>

      {post.image_path && (
        <div className="feed-image">
          <img src={mediaUrl(post.image_path)} alt="Post attachment" loading="lazy" />
        </div>
      )}

      <div className="feed-actions">
        <button type="button" className={`like-btn ${liked ? 'is-liked' : ''}`} onClick={onLike}>
          <Icon name="thumbs-up" size={16} />
          {likeCount} {likeCount === 1 ? 'like' : 'likes'}
        </button>
        <button type="button" className={`like-btn ${open ? 'is-liked' : ''}`} onClick={toggleComments}>
          <Icon name="message-square" size={16} />
          {count} {count === 1 ? 'comment' : 'comments'}
        </button>
        <span className="tiny muted hide-xs" style={{ marginLeft: 'auto' }}>
          {formatDateTime(post.created_at)}
        </span>
      </div>

      {open && (
        <div className="cf-comments">
          {loadingComments ? (
            <div className="row"><Spinner /> <span className="small muted">Loading comments…</span></div>
          ) : roots.length === 0 ? (
            <p className="small muted">No comments yet. Say something nice 👋</p>
          ) : (
            roots.map((comment) => (
              <div className="cf-comment" key={comment.id}>
                <AuthorAvatar name={comment.author_name} size="avatar-sm" />
                <div className="cf-comment-main">
                  <div className="comment-bubble">
                    <div className="row-between">
                      <span className="tiny strong">{comment.author_name}</span>
                      {comment.is_mine && (
                        <button
                          type="button"
                          className="cf-mini-del"
                          title="Delete comment"
                          onClick={async () => {
                            try {
                              await communityService.removeComment(comment.id);
                              setComments((current) => current.filter((c) => c.id !== comment.id && c.parent_id !== comment.id));
                              setCount((value) => Math.max(0, value - 1));
                              toast.success('Comment deleted.');
                            } catch (err) {
                              toast.error(toApiError(err).message);
                            }
                          }}
                        >
                          <Icon name="trash" size={12} />
                        </button>
                      )}
                    </div>
                    <div className="small">{comment.body}</div>
                  </div>
                  <div className="cf-comment-meta">
                    <span className="tiny muted">{timeAgo(comment.created_at)}</span>
                    <button
                      type="button"
                      className="cf-reply-btn"
                      onClick={() => { setReplyTo(replyTo === comment.id ? null : comment.id); setReplyDraft(''); }}
                    >
                      Reply
                    </button>
                  </div>

                  {repliesOf(comment.id).length > 0 && (
                    <div className="cf-replies">
                      {repliesOf(comment.id).map((reply) => (
                        <div className="cf-comment" key={reply.id}>
                          <AuthorAvatar name={reply.author_name} size="avatar-sm" />
                          <div className="cf-comment-main">
                            <div className="comment-bubble">
                              <div className="row-between">
                                <span className="tiny strong">{reply.author_name}</span>
                                {reply.is_mine && (
                                  <button
                                    type="button"
                                    className="cf-mini-del"
                                    title="Delete reply"
                                    onClick={async () => {
                                      try {
                                        await communityService.removeComment(reply.id);
                                        setComments((current) => current.filter((c) => c.id !== reply.id));
                                        setCount((value) => Math.max(0, value - 1));
                                        toast.success('Reply deleted.');
                                      } catch (err) {
                                        toast.error(toApiError(err).message);
                                      }
                                    }}
                                  >
                                    <Icon name="trash" size={12} />
                                  </button>
                                )}
                              </div>
                              <div className="small">{reply.body}</div>
                            </div>
                            <div className="cf-comment-meta">
                              <span className="tiny muted">{timeAgo(reply.created_at)}</span>
                              <button
                                type="button"
                                className="cf-reply-btn"
                                onClick={() => { setReplyTo(comment.id); setReplyDraft(''); }}
                              >
                                Reply
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {replyTo === comment.id && (
                    <form className="cf-reply-form" onSubmit={submitReply}>
                      <input
                        className="input"
                        placeholder={`Reply to ${comment.author_name === 'Anonymous' ? 'this comment' : comment.author_name}…`}
                        value={replyDraft}
                        maxLength={1000}
                        autoFocus
                        onChange={(event) => setReplyDraft(event.target.value)}
                      />
                      <PostAs
                        value={replyAsAnonymous}
                        onChange={setReplyAsAnonymous}
                        label="Reply as"
                        variant="chips"
                      />
                      <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--sp-2)' }}>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setReplyTo(null)}>
                          Cancel
                        </Button>
                        <Button type="submit" size="sm" icon="send" loading={sending}>Reply</Button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            ))
          )}

          <form className="cf-composer-form" onSubmit={submitComment}>
            <PostAs
              value={commentAsAnonymous}
              onChange={setCommentAsAnonymous}
              label="Comment as"
              variant="chips"
            />
            <div className="row" style={{ gap: 'var(--sp-2)' }}>
              <input
                className="input"
                placeholder="Write a comment…"
                value={commentDraft}
                maxLength={1000}
                onChange={(event) => setCommentDraft(event.target.value)}
              />
              <Button type="submit" icon="send" loading={sending}>Post</Button>
            </div>
          </form>
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------ create post */

function CreatePostModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('general');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBody('');
    setCategory('general');
    setIsAnonymous(false);
    setImageFile(null);
    setImagePreview('');
    setErrors({});
    setMessage('');
  }, [open]);

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
    setImagePreview(URL.createObjectURL(file));
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    if (body.trim().length < 2) {
      setErrors({ body: 'Write something in your post first.' });
      return;
    }
    setErrors({});

    const payload = new FormData();
    payload.append('body', body.trim());
    payload.append('category', category);
    payload.append('isAnonymous', String(isAnonymous));
    if (imageFile) payload.append('image', imageFile);

    setSaving(true);
    try {
      const response = await communityService.create(payload);
      toast.success(response.message);
      onCreated(response.data);
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
      title="Create post"
      subtitle="What's happening in your community?"
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon="send" loading={saving} onClick={submit}>Post</Button>
        </>
      )}
    >
      <form className="stack" onSubmit={submit}>
        {message && <FormMessage>{message}</FormMessage>}

        <TextArea
          aria-label="Your post"
          name="body"
          rows={5}
          required
          placeholder="Write your post…"
          value={body}
          error={errors.body}
          onChange={(event) => { setBody(event.target.value); setErrors({}); }}
        />

        <SelectInput
          label="Category"
          name="category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          options={CATEGORIES.filter((item) => item.value !== 'all')}
        />

        <Field label="Image" hint="Optional. JPG, PNG, WEBP or GIF up to 8 MB." error={errors.image}>
          {imagePreview ? (
            <div className="image-pick">
              <img src={imagePreview} alt="Post preview" className="image-pick-thumb" />
              <div className="image-pick-actions">
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                  Replace
                  <input type="file" accept={IMAGE_TYPES.join(',')} hidden onChange={onImage} />
                </label>
                <Button type="button" size="sm" variant="ghost" icon="trash"
                  onClick={() => { setImageFile(null); setImagePreview(''); }}>
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <label className="dropzone" style={{ cursor: 'pointer', display: 'block' }}>
              <input type="file" accept={IMAGE_TYPES.join(',')} hidden onChange={onImage} />
              <div className="stack-sm" style={{ alignItems: 'center' }}>
                <Icon name="image" size={26} style={{ color: 'var(--blue-500)' }} />
                <div className="strong">Add a photo</div>
                <div className="small muted">Click to browse · JPG, PNG, WEBP, GIF up to 8 MB</div>
              </div>
            </label>
          )}
        </Field>

        <PostAs
          value={isAnonymous}
          onChange={setIsAnonymous}
          label="Post as"
          noun="Your post"
          hint="Anonymous hides the public name only — your account stays on record for moderation."
        />
      </form>
    </Modal>
  );
}
