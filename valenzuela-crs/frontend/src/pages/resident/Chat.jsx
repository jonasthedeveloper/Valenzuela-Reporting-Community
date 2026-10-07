import { useEffect, useRef, useState } from 'react';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import { ErrorState, Loading } from '../../components/Feedback';
import * as helpdeskService from '../../services/helpdesk.service';
import { toApiError } from '../../services/api';
import { formatTime, initials } from '../../utils/format';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { useAuth } from '../../contexts/AuthContext';

const GREETING =
  "Hello! I'm your Barangay Help Desk Assistant. "
  + 'Ask me about creating reports, tracking reports, report categories, or using the Valenzuela CRS.';

const QUICK_ASKS = [
  'What categories can I report?',
  'How do I create a report?',
  'How do I track my report?',
  'How do I contact the barangay office?',
];

const CONNECTION_ERROR =
  "Sorry, I'm having trouble connecting right now. Please try again in a moment.";

const OFFLINE_ERROR =
  'You are currently offline. Internet connection is required for the AI Help Desk and submitting new reports.';

export default function Chat() {
  useDocumentTitle('Barangay Help Desk');
  const { user } = useAuth();
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [conversation, history] = await Promise.all([
        helpdeskService.getConversation(),
        helpdeskService.getMessages(),
      ]);
      setThread(conversation.conversation);
      setMessages(history.messages);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, typing]);

  const growInput = (event) => {
    const el = event.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const resetInput = () => {
    setDraft('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const send = async (text) => {
    const body = (text ?? draft).trim();
    if (!body || sending) return;

    // Never attempt the AI call while offline — show the clear offline notice instead.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setMessages((current) => [...current, {
        id: `temp-offline-${Date.now()}`,
        body: OFFLINE_ERROR,
        sender_type: 'assistant',
        sender_name: 'Barangay help desk',
        created_at: new Date().toISOString(),
      }]);
      return;
    }

    resetInput();
    setSending(true);
    setTyping(true);

    const optimisticId = `temp-${Date.now()}`;
    setMessages((current) => [...current, {
      id: optimisticId,
      body,
      sender_type: 'user',
      sender_name: user.fullName,
      created_at: new Date().toISOString(),
    }]);

    try {
      const data = await helpdeskService.chat(body);
      setMessages((current) => [
        ...current.filter((item) => item.id !== optimisticId),
        data.userMessage,
      ]);
      window.setTimeout(() => {
        setMessages((current) => [...current, data.assistantMessage]);
        setTyping(false);
        setSending(false);
      }, 600);
    } catch (err) {
      // Answer inside the chat with a friendly message — never raw errors.
      setMessages((current) => [...current, {
        id: `temp-error-${Date.now()}`,
        body: toApiError(err).message || CONNECTION_ERROR,
        sender_type: 'assistant',
        sender_name: 'Barangay help desk',
        created_at: new Date().toISOString(),
      }]);
      setTyping(false);
      setSending(false);
    }
  };

  if (loading) return <Loading label="Opening the help desk…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="chat-page">
      <div className="page-head chat-page-head">
        <div>
          <h1 className="page-title">Barangay Help Desk</h1>
          <p className="page-sub">Online • replies instantly</p>
        </div>
      </div>

      <section className="card chat-shell">
        <header className="chat-head">
          <div className="avatar green"><Icon name="message-circle" size={19} /></div>
          <div>
            <div className="strong">{thread.assistantName}</div>
            <div className="tiny muted">
              <span className="online-dot" /> Online · replies instantly
            </div>
          </div>
        </header>

        <div className="chat-scroll" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="bubble bubble-bot">
              <div className="tiny strong" style={{ marginBottom: 2 }}>
                Barangay help desk
              </div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{GREETING}</div>
            </div>
          )}

          {messages.map((message) => {
            const mine = message.sender_type === 'user';
            return (
              <div key={message.id} className={`bubble ${mine ? 'bubble-user' : 'bubble-bot'}`}>
                {!mine && (
                  <div className="tiny strong" style={{ marginBottom: 2 }}>
                    {message.sender_name || 'Barangay help desk'}
                  </div>
                )}
                <div style={{ whiteSpace: 'pre-wrap' }}>{message.body}</div>
                <div className="bubble-meta">{formatTime(message.created_at)}</div>
              </div>
            );
          })}

          {typing && (
            <div className="bubble bubble-bot">
              <div className="tiny muted" style={{ marginBottom: 4 }}>AI is typing…</div>
              <div className="typing"><span /><span /><span /></div>
            </div>
          )}
        </div>

        <div className="chat-quick" role="group" aria-label="Suggested questions">
          {QUICK_ASKS.map((question) => (
            <button
              key={question}
              type="button"
              className="tab"
              disabled={sending}
              onClick={() => send(question)}
            >
              {question}
            </button>
          ))}
        </div>

        <form
          className="chat-form"
          onSubmit={(event) => { event.preventDefault(); send(); }}
        >
          <div className="avatar avatar-sm">{initials(user.fullName)}</div>
          <textarea
            ref={inputRef}
            className="textarea chat-input"
            placeholder="Type your message…"
            rows={1}
            value={draft}
            maxLength={2000}
            disabled={sending}
            onChange={(event) => { setDraft(event.target.value); growInput(event); }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
          />
          <Button type="submit" icon="send" loading={sending} disabled={!draft.trim()}>
            Send
          </Button>
        </form>
      </section>
    </div>
  );
}
