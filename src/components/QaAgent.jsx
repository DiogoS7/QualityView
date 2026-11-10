import { Fragment, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LuX, LuSend, LuKeyRound, LuArrowRight } from 'react-icons/lu';
import { answerQuestion, contextForModel, SUGGESTIONS } from '../lib/assistant.js';
import { askClaude, getApiKey, setApiKey, CLAUDE_MODEL } from '../lib/claude.js';
import { AgentIcon } from './LogoMark.jsx';

const WELCOME = {
  role: 'assistant',
  text: "Hi! I'm the QA Agent. Ask me about go-live readiness, any defect, requirement or test, a sprint's results, the team or a QA term.",
  actions: [],
};

/** Renders **bold** and "• " bullet lines from agent answers as safe React nodes. */
function RichText({ text }) {
  return text.split('\n').map((line, i) => {
    const bullet = line.startsWith('• ');
    const parts = (bullet ? line.slice(2) : line).split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith('**') && p.endsWith('**') ? (
        <b key={j} className="font-semibold text-ink">
          {p.slice(2, -2)}
        </b>
      ) : (
        <Fragment key={j}>{p}</Fragment>
      ),
    );
    if (bullet)
      return (
        <span key={i} className="flex gap-1.5 pl-1">
          <span className="text-faint">•</span>
          <span>{parts}</span>
        </span>
      );
    return line ? (
      <span key={i} className="block">
        {parts}
      </span>
    ) : (
      <span key={i} className="block h-2" />
    );
  });
}

/** Floating QA assistant, bottom-right. Built-in answers by default; Claude when a key is connected. */
export default function QaAgent({ context, onAction }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [apiKey, setKey] = useState(getApiKey);
  const [showKey, setShowKey] = useState(false);
  const [draftKey, setDraftKey] = useState('');
  const log = useRef(null);
  const field = useRef(null);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  useEffect(() => {
    if (open) setTimeout(() => field.current?.focus(), 250);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const ask = async (q) => {
    const question = q.trim();
    if (!question || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setBusy(true);
    const local = answerQuestion(question, context);
    let reply = local;
    if (apiKey) {
      try {
        const history = messages.filter((m) => m !== WELCOME).map((m) => ({ role: m.role, content: m.text }));
        const text = await askClaude({ apiKey, question, history, context: contextForModel(context) });
        reply = { text, actions: local.actions, via: 'claude' };
      } catch (e) {
        reply = { ...local, note: `Claude unavailable (${e.message}) – answered from the built-in guide.` };
        if (e.status === 401) {
          setApiKey('');
          setKey('');
        }
      }
    } else {
      await new Promise((ok) => setTimeout(ok, 450)); // a short beat so the answer doesn't feel canned
    }
    setMessages((m) => [...m, { role: 'assistant', ...reply }]);
    setBusy(false);
  };

  const saveKey = (e) => {
    e.preventDefault();
    setApiKey(draftKey);
    setKey(draftKey.trim());
    setDraftKey('');
    setShowKey(false);
  };
  const disconnect = () => {
    setApiKey('');
    setKey('');
    setShowKey(false);
  };

  const userTurns = messages.filter((m) => m.role === 'user').length;

  return (
    <div className="fixed right-3.5 bottom-[84px] z-40 md:right-6 md:bottom-6">
      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label="QA Agent"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ transformOrigin: 'bottom right' }}
            className="glass absolute right-0 bottom-[74px] flex h-[min(600px,calc(100dvh-180px))] w-[min(400px,calc(100vw-28px))] flex-col overflow-hidden rounded-[26px] !bg-[#121828]/80 md:h-[min(600px,calc(100dvh-120px))]"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 p-3">
              <div className="glass-inset flex min-w-0 flex-1 items-center gap-3 rounded-[18px] px-3 py-2.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.08]">
                  <AgentIcon size={22} className="text-white" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">QA Agent</p>
                  <p className="flex items-center gap-1.5 truncate text-[11px] text-muted">
                    <i className={`size-1.5 rounded-full ${apiKey ? 'bg-violet shadow-[0_0_6px_#8b7bff]' : 'bg-pass shadow-[0_0_6px_#4ade80]'}`} />
                    {apiKey ? `Claude · ${CLAUDE_MODEL}` : 'Built-in · uses release data'}
                  </p>
                </div>
                <button
                  onClick={() => setShowKey((v) => !v)}
                  aria-label="Connect Claude"
                  title={apiKey ? 'Claude connected' : 'Connect Claude (optional)'}
                  className={`ml-auto grid size-8 shrink-0 place-items-center rounded-lg transition hover:bg-white/10 ${apiKey ? 'text-violet' : 'text-muted'}`}
                >
                  <LuKeyRound size={15} />
                </button>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close QA Agent" className="glass-inset grid size-10 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-white/15 hover:text-ink">
                <LuX size={17} />
              </button>
            </div>

            {/* Optional Claude connection */}
            <AnimatePresence initial={false}>
              {showKey && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-3">
                  <div className="glass-inset mb-2 rounded-[16px] p-3 text-[11px] leading-relaxed text-muted">
                    {apiKey ? (
                      <div className="flex items-center justify-between gap-3">
                        <span>Claude is answering, using this release's data. Your key stays in this tab only.</span>
                        <button onClick={disconnect} className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 font-semibold text-ink hover:bg-white/15">
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={saveKey} className="flex flex-col gap-2">
                        <span>
                          Optional: paste an Anthropic API key to let Claude answer open questions. It is kept in this browser tab only and sent straight to Anthropic. Usage is billed to your API account.
                        </span>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            value={draftKey}
                            onChange={(e) => setDraftKey(e.target.value)}
                            placeholder="sk-ant-…"
                            autoComplete="off"
                            className="min-w-0 flex-1 rounded-lg bg-white/[0.07] px-3 py-2 text-xs text-ink outline-none placeholder:text-faint focus:bg-white/10"
                          />
                          <button type="submit" disabled={!draftKey.trim()} className="rounded-lg bg-white px-3 text-xs font-semibold text-[#0f1524] disabled:opacity-40">
                            Connect
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Conversation */}
            <div ref={log} className="scroll-glass flex flex-1 flex-col gap-2.5 overflow-y-auto px-3 py-2" aria-live="polite">
              {messages.map((m, i) =>
                m.role === 'user' ? (
                  <div key={i} className="max-w-[85%] self-end rounded-[16px] rounded-br-md bg-white px-3.5 py-2 text-xs leading-relaxed text-[#0f1524]">
                    {m.text}
                  </div>
                ) : (
                  <div key={i} className="max-w-[92%] self-start">
                    <div className="glass-inset rounded-[16px] rounded-bl-md px-3.5 py-2.5 text-xs leading-relaxed text-muted">
                      <RichText text={m.text} />
                      {m.note && <span className="mt-2 block text-[10px] text-blocked">{m.note}</span>}
                    </div>
                    {m.actions?.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {m.actions.map((a) => (
                          <button
                            key={a.label}
                            onClick={() => {
                              onAction(a);
                              if (window.innerWidth < 768) setOpen(false);
                            }}
                            className="flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-ink transition hover:bg-white/15"
                          >
                            {a.label} <LuArrowRight size={11} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ),
              )}
              {userTurns < 2 && !busy && (
                <div className="mt-1 flex flex-col items-start gap-1.5">
                  <p className="px-1 text-[10px] font-semibold tracking-[0.14em] text-faint uppercase">Try asking</p>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => ask(s)}
                      className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-left text-[11px] text-muted transition hover:bg-white/12 hover:text-ink"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {busy && (
                <div className="glass-inset flex gap-1 self-start rounded-[16px] rounded-bl-md px-3.5 py-3" aria-label="Thinking">
                  {[0, 1, 2].map((d) => (
                    <motion.i
                      key={d}
                      className="size-1.5 rounded-full bg-white/60"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: d * 0.15 }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
              className="flex gap-2 border-t border-white/10 p-3"
            >
              <input
                ref={field}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about the release…"
                className="glass-inset min-w-0 flex-1 rounded-full px-4 py-2.5 text-sm outline-none placeholder:text-faint focus:bg-white/10"
              />
              <button
                type="submit"
                disabled={!input.trim() || busy}
                aria-label="Send"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#0f1524] transition disabled:opacity-40"
              >
                <LuSend size={16} />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close QA Agent' : 'Open QA Agent'}
        aria-expanded={open}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        className="relative grid size-14 place-items-center rounded-full border border-[#7aa2ff]/50 shadow-[0_14px_34px_rgba(0,0,0,0.3),0_0_18px_rgba(91,134,240,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-xl backdrop-saturate-150 md:size-[60px]"
        style={{
          background:
            'radial-gradient(circle at 30% 22%, rgba(255,255,255,.28) 0%, rgba(255,255,255,0) 50%), linear-gradient(160deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,.05) 100%), rgba(30,42,70,.35)',
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={open ? 'x' : 'spark'} initial={{ rotate: -40, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 40, opacity: 0 }} transition={{ duration: 0.15 }}>
            {open ? <LuX size={24} className="text-white" /> : <AgentIcon size={26} className="text-white" />}
          </motion.span>
        </AnimatePresence>
        {!open && userTurns === 0 && <span className="absolute -top-0.5 -right-0.5 size-3.5 rounded-full bg-pass shadow-[0_0_0_1.5px_rgba(255,255,255,0.35),0_0_8px_rgba(74,222,128,0.8)]" />}
      </motion.button>
    </div>
  );
}
