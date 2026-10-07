import { useCallback, useEffect, useState } from 'react';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import Pagination from '../../components/Pagination';
import PostAs from '../../components/PostAs';
import { EmptyState, ErrorState, Loading, Spinner } from '../../components/Feedback';
import * as announcementService from '../../services/announcement.service';
import { toApiError } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { ANNOUNCEMENT_TYPES } from '../../constants';
import { formatDateTime, timeAgo, initials, mediaUrl } from '../../utils/format';
import useDocumentTitle from '../../hooks/useDocumentTitle';

const TYPE_BADGE = { announcement: 'verified', event: 'resolved', advisory: 'high' };

/** Anonymous authors get a neutral mask avatar instead of initials. */
export function AuthorAvatar({ name, size = '' }) {
  if (name === 'Anonymous') {
    return (
      <span className={`avatar avatar-anon ${size}`} title="Anonymous">
        <Icon name="eye-off" size={16} />
      </span>
    );
  }
  return <span className={`avatar ${size}`}>{initials(name)}</span>;
}

export default function Feed() {
  useDocumentTitle('Community feed');
  const toast = useToast();
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await announcementService.feed({ type, page, limit: 8 });
      setPosts(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [type, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [type]);

  const handleLike = async (post) => {
    const liked = Number(post.liked_by_me) > 0;
    setPosts((current) => current.map((item) => (item.id === post.id
      ? { ...item, liked_by_me: liked ? 0 : 1, like_count: Number(item.like_count) + (liked ? -1 : 1) }
      : item)));
    try {
      const response = await announcementService.toggleLike(post.id);
      setPosts((current) => current.map((item) => (item.id === post.id
        ? { ...item, liked_by_me: response.data.liked ? 1 : 0, like_count: response.data.likeCount }
        : item)));
    } catch (err) {
      toast.error(toApiError(err).message);
      load();
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Barangay announcements</h1>
          <p className="page-sub">Official notices, events and public advisories from the barangay office.</p>
        </div>
      </div>

      <div className="tabs">
        {[{ value: 'all', label: 'All' }, ...ANNOUNCEMENT_TYPES].map((item) => (
          <button
            key={item.value}
            type="button"
            className={`tab ${type === item.value ? 'is-active' : ''}`}
            onClick={() => setType(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading label="Loading the feed…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : posts.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="megaphone"
            title="Nothing posted yet"
            text="When the barangay office publishes a notice, it shows up right here."
          />
        </div>
      ) : (
        <div className="stack">
          {posts.map((post) => (
            <Post key={post.id} post={post} onLike={() => handleLike(post)} />
          ))}
          <Pagination meta={meta} onChange={setPage} label="posts" />
        </div>
      )}
    </>
  );
}

function Post({ post, onLike }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [commentAsAnonymous, setCommentAsAnonymous] = useState(false);
  const [count, setCount] = useState(Number(post.comment_count));

  const toggleComments = async () => {
    const next = !open;
    setOpen(next);
    if (next && comments.length === 0) {
      setLoadingComments(true);
      try {
        const response = await announcementService.comments(post.id);
        setComments(response.data);
      } catch (err) {
        toast.error(toApiError(err).message);
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const submitComment = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (body.length < 2) {
      toast.error('Write a comment first.');
      return;
    }
    setSending(true);
    try {
      const response = await announcementService.addComment(post.id, {
        body, isAnonymous: commentAsAnonymous,
      });
      setComments((current) => [...current, response.data]);
      setCount((value) => value + 1);
      setDraft('');
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setSending(false);
    }
  };

  const liked = Number(post.liked_by_me) > 0;

  return (
    <article className="card feed-post">
      <div className="row" style={{ marginBottom: 'var(--sp-3)' }}>
        <AuthorAvatar name={post.author_name} />
        <div>
          <div className="strong">{post.author_name}</div>
          <div className="tiny muted">
            {timeAgo(post.publish_at || post.created_at)}
            {post.barangay ? ` · Barangay ${post.barangay}` : ' · City-wide'}
          </div>
        </div>
        <span className={`badge badge-${TYPE_BADGE[post.type] || 'neutral'}`} style={{ marginLeft: 'auto' }}>
          {post.type}
        </span>
      </div>

      <h2 style={{ fontSize: '1.05rem', marginBottom: 6 }}>{post.title}</h2>
      <p className="feed-body small" style={{ whiteSpace: 'pre-wrap' }}>{post.body}</p>

      {post.image_path && (
        <div className="feed-image">
          <img src={mediaUrl(post.image_path)} alt={post.title} loading="lazy" />
        </div>
      )}

      <div className="feed-actions">
        <button type="button" className={`like-btn ${liked ? 'is-liked' : ''}`} onClick={onLike}>
          <Icon name="thumbs-up" size={16} />
          {Number(post.like_count)} {Number(post.like_count) === 1 ? 'like' : 'likes'}
        </button>
        <button type="button" className="like-btn" onClick={toggleComments}>
          <Icon name="message-square" size={16} />
          {count} {count === 1 ? 'comment' : 'comments'}
        </button>
        <span className="tiny muted" style={{ marginLeft: 'auto' }}>
          {formatDateTime(post.publish_at || post.created_at)}
        </span>
      </div>

      {open && (
        <div style={{ marginTop: 'var(--sp-4)' }}>
          {loadingComments ? (
            <div className="row"><Spinner /> <span className="small muted">Loading comments…</span></div>
          ) : comments.length === 0 ? (
            <p className="small muted">No comments yet. Be the first to reply.</p>
          ) : (
            comments.map((comment) => (
              <div className="comment" key={comment.id}>
                <AuthorAvatar name={comment.author_name} size="avatar-sm" />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="comment-bubble">
                    <div className="tiny strong">{comment.author_name}</div>
                    <div className="small">{comment.body}</div>
                  </div>
                  <div className="tiny muted" style={{ marginTop: 4 }}>{timeAgo(comment.created_at)}</div>
                </div>
              </div>
            ))
          )}

          <div className="comment-composer">
            <PostAs
              value={commentAsAnonymous}
              onChange={setCommentAsAnonymous}
              label="Comment as"
              variant="chips"
            />
            <form className="row" style={{ marginTop: 'var(--sp-2)' }} onSubmit={submitComment}>
              <input
                className="input"
                placeholder="Write a comment…"
                value={draft}
                maxLength={800}
                onChange={(event) => setDraft(event.target.value)}
              />
              <Button type="submit" icon="send" loading={sending}>Post</Button>
            </form>
          </div>
        </div>
      )}
    </article>
  );
}
