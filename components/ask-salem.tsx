'use client';

// Ask Salem — floating docs-assistant widget backed by salem.opencoven.ai.
//
// Transport: on https://docs.opencoven.ai the browser calls Salem directly
// (Salem's CORS allowlists that origin) so each visitor spends their own
// Salem rate-limit budget. Everywhere else (localhost, previews) requests go
// through the same-origin /api/ask-salem bridge, which enforces its own
// per-IP and per-instance limits. Both paths stream text/plain.
//
// Salem's public contract is single-turn: follow-up history requires an
// admin password upstream, so every question here is sent standalone (the
// conversation log is client-side only). Answers are rendered from a minimal
// markdown subset using React elements — never innerHTML.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Icon } from '@iconify/react';
import { usePathname } from 'next/navigation';
import s from './ask-salem.module.css';

const PRODUCTION_ORIGIN = 'https://docs.opencoven.ai';
const DIRECT_ENDPOINT = 'https://salem.opencoven.ai/api/chat';
const BRIDGE_ENDPOINT = '/api/ask-salem';
const SALEM_HOME = 'https://salem.opencoven.ai';
const MESSAGE_MAX_CHARS = 2000;
const SEND_COOLDOWN_MS = 3000; // client-side floor between sends

const STARTERS = [
  'How do I get started with Coven?',
  'What is a familiar?',
  'How do harness adapters work?',
  'How does persistent memory work?',
];

interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

function endpointForOrigin(): string {
  if (
    typeof window !== 'undefined' &&
    window.location.origin === PRODUCTION_ORIGIN
  ) {
    return DIRECT_ENDPOINT;
  }
  return BRIDGE_ENDPOINT;
}

/** docs.opencoven.ai links navigate in-app; everything else opens a new tab. */
function AnswerLink({ href, children }: { href: string; children: ReactNode }) {
  // Note: a bare "//host" prefix is protocol-relative (off-site), not internal.
  const internal =
    href.startsWith(`${PRODUCTION_ORIGIN}/`) ||
    (href.startsWith('/') && !href.startsWith('//'));
  const resolved = internal
    ? href.replace(PRODUCTION_ORIGIN, '') || '/'
    : href;
  if (internal) {
    return <a href={resolved}>{children}</a>;
  }
  return (
    <a href={resolved} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  );
}

/** Inline markdown: [text](url), `code`, **bold**. Returns React elements. */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)|`([^`]+)`|\*\*([^*]+)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    if (match[1] !== undefined && match[2] !== undefined) {
      out.push(
        <AnswerLink key={`${keyPrefix}-l${i}`} href={match[2]}>
          {match[1]}
        </AnswerLink>,
      );
    } else if (match[3] !== undefined) {
      out.push(<code key={`${keyPrefix}-c${i}`}>{match[3]}</code>);
    } else if (match[4] !== undefined) {
      out.push(<strong key={`${keyPrefix}-b${i}`}>{match[4]}</strong>);
    }
    last = pattern.lastIndex;
    i += 1;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Block-level markdown subset: paragraphs, bullet lists, fenced code. */
function AnswerMarkdown({ content }: { content: string }) {
  const blocks: ReactNode[] = [];
  const segments = content.split(/```/);

  segments.forEach((segment, si) => {
    if (si % 2 === 1) {
      // Fenced code block; first line may be a language tag.
      const lines = segment.replace(/^[a-zA-Z0-9_-]*\n/, '');
      blocks.push(
        <pre key={`code-${si}`}>
          <code>{lines.replace(/\n$/, '')}</code>
        </pre>,
      );
      return;
    }
    for (const [pi, para] of segment.split(/\n{2,}/).entries()) {
      const trimmed = para.trim();
      if (!trimmed) continue;
      const lines = trimmed.split('\n');
      const isList = lines.every((line) => /^[-*]\s+/.test(line.trim()));
      if (isList) {
        blocks.push(
          <ul key={`ul-${si}-${pi}`}>
            {lines.map((line, li) => (
              <li key={li}>
                {renderInline(line.trim().replace(/^[-*]\s+/, ''), `${si}-${pi}-${li}`)}
              </li>
            ))}
          </ul>,
        );
      } else {
        blocks.push(
          <p key={`p-${si}-${pi}`}>{renderInline(trimmed, `${si}-${pi}`)}</p>,
        );
      }
    }
  });

  return <>{blocks}</>;
}

function parseRetryAfterSec(res: Response): number {
  const retryAfter = Number(res.headers.get('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter, 600);
  }
  const reset = Number(res.headers.get('x-ratelimit-reset'));
  if (Number.isFinite(reset) && reset > Date.now()) {
    return Math.min(Math.ceil((reset - Date.now()) / 1000), 600);
  }
  return 60;
}

export function AskSalem() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // Docs pages pin a sidebar footer bottom-left; lift the launcher above it.
  const overSidebar = pathname?.startsWith('/docs') ?? false;
  const [question, setQuestion] = useState('');
  const [log, setLog] = useState<Turn[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [notice, setNotice] = useState('');
  const [cooldownSec, setCooldownSec] = useState(0);

  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSentAt = useRef(0);
  const cooldownUntil = useRef(0);

  // Tick the cooldown countdown while active.
  useEffect(() => {
    if (cooldownSec <= 0) return;
    const timer = setInterval(() => {
      const left = Math.max(
        0,
        Math.ceil((cooldownUntil.current - Date.now()) / 1000),
      );
      setCooldownSec(left);
      if (left <= 0) clearInterval(timer);
    }, 500);
    return () => clearInterval(timer);
  }, [cooldownSec > 0]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const appendAssistant = useCallback((content: string) => {
    setLog((turns) => {
      const next = [...turns];
      const tail = next[next.length - 1];
      if (tail?.role === 'assistant') next[next.length - 1] = { ...tail, content };
      return next;
    });
  }, []);

  const ask = useCallback(
    async (raw: string) => {
      const message = raw.trim();
      if (!message || streaming) return;
      if (Date.now() < cooldownUntil.current) return;
      if (Date.now() - lastSentAt.current < SEND_COOLDOWN_MS) return;
      lastSentAt.current = Date.now();

      setNotice('');
      setQuestion('');
      setStreaming(true);
      setLog((turns) => [
        ...turns,
        { role: 'user', content: message },
        { role: 'assistant', content: '' },
      ]);

      try {
        const res = await fetch(endpointForOrigin(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            history: [],
            model: 'gpt-5.2',
            retrieval: 'auto',
          }),
        });

        if (!res.ok) {
          // Drop the empty assistant stub and restore the question.
          setLog((turns) => turns.slice(0, -2));
          setQuestion(message);
          if (res.status === 429 || res.status === 503) {
            const wait = parseRetryAfterSec(res);
            cooldownUntil.current = Date.now() + wait * 1000;
            setCooldownSec(wait);
            setNotice(
              'Salem is rate-limited to stay available for everyone. You can send another question shortly.',
            );
          } else {
            const data = (await res.json().catch(() => ({}))) as {
              error?: string;
            };
            setNotice(data.error || 'Salem could not answer right now. Please try again.');
          }
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          appendAssistant('Salem returned an empty response. Please try again.');
          return;
        }
        const decoder = new TextDecoder();
        let answer = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          answer += decoder.decode(value, { stream: true });
          appendAssistant(answer);
        }
        answer += decoder.decode();
        appendAssistant(answer.trim() || 'Salem returned an empty response.');
      } catch {
        appendAssistant('Connection to Salem failed. Please try again.');
      } finally {
        setStreaming(false);
        inputRef.current?.focus();
      }
    },
    [appendAssistant, streaming],
  );

  const onSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      void ask(question);
    },
    [ask, question],
  );

  const blocked = streaming || cooldownSec > 0;

  if (!open) {
    return (
      <button
        type="button"
        className={overSidebar ? `${s.launcher} ${s.overSidebar}` : s.launcher}
        onClick={() => setOpen(true)}
        aria-label="Ask Salem, the OpenCoven documentation assistant"
      >
        <Icon icon="ph:moon-stars-duotone" width={16} color="var(--coven-violet)" aria-hidden="true" />
        Ask Salem
      </button>
    );
  }

  return (
    <div
      className={s.panel}
      role="dialog"
      aria-label="Ask Salem, the OpenCoven documentation assistant"
    >
      <div className={s.header}>
        <div className={s.headerBadge} aria-hidden="true">
          <Icon icon="ph:moon-stars-duotone" width={16} />
        </div>
        <div className={s.headerText}>
          <div className={s.headerTitle}>Ask Salem</div>
          <div className={s.headerSub}>Searches these docs · answers may be imperfect</div>
        </div>
        <button
          type="button"
          className={s.headerClose}
          onClick={close}
          aria-label="Close Ask Salem"
        >
          <Icon icon="ph:x-bold" width={14} aria-hidden="true" />
        </button>
      </div>

      <div className={s.log} ref={logRef} aria-live="polite">
        {log.length === 0 ? (
          <div className={s.emptyState}>
            <p className={s.emptyLead}>
              Salem searches the Coven documentation and answers with linked
              sources. Each question is answered on its own.
            </p>
            <div className={s.starters}>
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  className={s.starter}
                  disabled={blocked}
                  onClick={() => void ask(starter)}
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          log.map((turn, index) =>
            turn.role === 'user' ? (
              <div key={index} className={s.msgUser}>
                {turn.content}
              </div>
            ) : (
              <div key={index} className={s.msgAssistant}>
                {turn.content ? (
                  <AnswerMarkdown content={turn.content} />
                ) : (
                  <span className={s.thinking}>
                    <span className={s.thinkingDot} aria-hidden="true" />
                    Salem is reading the docs…
                  </span>
                )}
              </div>
            ),
          )
        )}
        {notice && <div className={s.errorNote} role="status">{notice}</div>}
      </div>

      <form className={s.form} onSubmit={onSubmit}>
        <div className={s.inputRow}>
          <input
            ref={inputRef}
            type="text"
            className={s.input}
            placeholder={
              cooldownSec > 0
                ? `Rate limited — retry in ${cooldownSec}s`
                : 'Ask about Coven…'
            }
            maxLength={MESSAGE_MAX_CHARS}
            autoComplete="off"
            value={question}
            disabled={blocked && cooldownSec > 0}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <button
            type="submit"
            className={s.send}
            disabled={blocked || question.trim().length === 0}
          >
            {streaming ? 'Asking…' : cooldownSec > 0 ? `${cooldownSec}s` : 'Ask'}
            {!streaming && cooldownSec === 0 && (
              <Icon icon="ph:paper-plane-tilt-bold" width={13} aria-hidden="true" />
            )}
          </button>
        </div>
        <div className={s.footer}>
          <span>Rate-limited & abuse-protected. No account needed.</span>
          <a
            className={s.footerLink}
            href={SALEM_HOME}
            target="_blank"
            rel="noreferrer noopener"
          >
            salem.opencoven.ai
          </a>
        </div>
      </form>
    </div>
  );
}
