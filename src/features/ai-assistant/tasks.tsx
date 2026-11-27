'use client';

import { Plus, Send, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { IMPROVE_MODES, type AiErrorCode, type ImproveMode } from '@/lib/ai/schemas';
import { actions } from '@/stores/editor-store';
import type { ListEntry, Resume } from '@/types/resume';
import { useAiRequest } from './client';
import { resumeContext } from './context';
import { AiStatusLine, Bullets, Suggestion } from './parts';
import { ensureApiKey } from './api-key';
import { useAssistant, type ImproveTarget } from './store';

const Note = ({ children }: { children: ReactNode }) => (
  <p className="text-muted-foreground text-sm">{children}</p>
);

function Run({
  loading,
  disabled,
  onClick,
  children,
}: {
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button variant="primary" disabled={loading || disabled} onClick={onClick}>
      <Sparkles />
      {children}
    </Button>
  );
}

// ---------- Chat ----------
type Message = { role: 'user' | 'model'; text: string };

export function ChatTask({
  resume,
  messages,
  setMessages,
}: {
  resume: Resume;
  messages: Message[];
  setMessages: (m: Message[]) => void;
}) {
  const t = useTranslations('ai.chat');
  const request = useAiRequest('chat');
  const [input, setInput] = useState('');
  const [share, setShare] = useState(false);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || request.loading) return;
    // Asked first, so the question stays in the box if setup is closed.
    if (!(await ensureApiKey())) return;
    const next: Message[] = [...messages, { role: 'user', text: question.slice(0, 4000) }];
    setMessages(next);
    setInput('');
    const context = share ? resumeContext(resume) : undefined;
    const result = await request.run({
      language: resume.language,
      messages: next.slice(-12),
      context: context || undefined,
    });
    if (result) setMessages([...next, { role: 'model', text: result.reply.slice(0, 4000) }]);
  };
  const retry = async () => {
    const result = await request.retry();
    if (result) setMessages([...messages, { role: 'model', text: result.reply.slice(0, 4000) }]);
  };

  return (
    <div className="space-y-3">
      {messages.length === 0 && (
        <div className="space-y-2">
          <Note>{t('intro')}</Note>
          <ul className="space-y-1.5">
            {['template', 'summary', 'project', 'junior', 'experience'].map((key) => (
              <li key={key}>
                <button
                  type="button"
                  className="border-border bg-surface hover:border-primary w-full rounded-md border px-3 py-2 text-left text-sm"
                  onClick={() => void send(t(`starters.${key}`))}
                >
                  {t(`starters.${key}`)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ol className="space-y-3" aria-live="polite">
        {messages.map((m, i) => (
          <li
            key={i}
            className={
              m.role === 'user'
                ? 'bg-muted ml-8 rounded-lg p-3 text-sm whitespace-pre-wrap'
                : 'border-primary border-l-2 pl-3 text-sm whitespace-pre-wrap'
            }
          >
            <span className="sr-only">{t(m.role === 'user' ? 'you' : 'assistant')}: </span>
            {m.text}
          </li>
        ))}
      </ol>
      <AiStatusLine
        loading={request.loading}
        error={request.error}
        onRetry={() => void retry()}
        onCancel={request.reset}
      />
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <Textarea
          aria-label={t('input')}
          placeholder={t('input')}
          rows={3}
          maxLength={4000}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send(input);
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              className="accent-primary size-4"
              checked={share}
              onChange={(e) => setShare(e.target.checked)}
            />
            {t('share')}
          </label>
          <Button
            type="submit"
            size="sm"
            variant="primary"
            disabled={!input.trim() || request.loading}
          >
            <Send />
            {t('send')}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ---------- Summary ----------
export function SummaryTask({ resume }: { resume: Resume }) {
  const t = useTranslations('ai.summary');
  const request = useAiRequest('generate-summary');
  const [goals, setGoals] = useState('');
  const [dismissed, setDismissed] = useState<string[]>([]);
  const context = resumeContext(resume);
  const run = () => {
    setDismissed([]);
    void request.run({ language: resume.language, context, targetRole: resume.targetRole, goals });
  };
  return (
    <div className="space-y-3">
      <Note>{t('intro')}</Note>
      <Field label={t('role')}>
        {(p) => (
          <Input
            {...p}
            maxLength={300}
            value={resume.targetRole}
            onChange={(e) => actions.setMeta({ targetRole: e.target.value })}
          />
        )}
      </Field>
      <Field label={t('goals')}>
        {(p) => (
          <Textarea
            {...p}
            rows={2}
            maxLength={2000}
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
          />
        )}
      </Field>
      {!context && <Note>{t('needContent')}</Note>}
      <Run loading={request.loading} disabled={!context} onClick={run}>
        {t('run')}
      </Run>
      <AiStatusLine
        loading={request.loading}
        error={request.error}
        onRetry={() => void request.retry()}
        onCancel={request.reset}
      />
      {request.data?.options
        .filter((o) => !dismissed.includes(o.style))
        .map((option) => (
          <Suggestion
            key={option.style + option.text}
            label={t(`styles.${option.style}`)}
            original={resume.data.summary.professional}
            suggested={option.text}
            onAccept={(text) => {
              actions.setSummary({ professional: text.slice(0, 8000) });
              toast.success(t('applied'));
              request.reset();
            }}
            onReject={() => setDismissed([...dismissed, option.style])}
            onRegenerate={run}
          />
        ))}
    </div>
  );
}

// ---------- Improve writing ----------
type Choice = ImproveTarget & { label: string; text: string; role: string };

export function ImproveTask({ resume }: { resume: Resume }) {
  const t = useTranslations('ai.improve');
  const fields = useTranslations('fields');
  const request = useAiRequest('improve-experience');
  const { target, setTarget } = useAssistant();
  const [mode, setMode] = useState<ImproveMode>('improve');
  const choices: Choice[] = (
    [
      ['experience', ['description', 'achievements']],
      ['projects', ['description']],
      ['volunteer', ['description']],
    ] as const
  ).flatMap(([section, names]) =>
    (resume.data[section] as unknown as Record<string, string>[]).flatMap((entry) =>
      names.map((field) => {
        const role = entry.title || entry.role || entry.name || '';
        return {
          section,
          id: entry.id!,
          field,
          role,
          text: entry[field] ?? '',
          label: `${role || fields(`${section}.${field}`)} — ${fields(`${section}.${field}`)}`,
        };
      }),
    ),
  );
  const key = (c: ImproveTarget) => `${c.section}|${c.id}|${c.field}`;
  const selected =
    choices.find((c) => target && key(c) === key(target)) ?? choices.find((c) => c.text.trim());
  const run = () =>
    selected &&
    void request.run({ language: resume.language, text: selected.text, role: selected.role, mode });
  // The suggestion belongs to the text it was generated from.
  const [source, setSource] = useState('');

  if (!choices.length) return <Note>{t('none')}</Note>;
  return (
    <div className="space-y-3">
      <Note>{t('intro')}</Note>
      <Field label={t('which')}>
        {(p) => (
          <Select
            {...p}
            value={selected ? key(selected) : ''}
            onChange={(e) => {
              const next = choices.find((c) => key(c) === e.target.value);
              if (next) setTarget({ section: next.section, id: next.id, field: next.field });
              request.reset();
            }}
          >
            {choices.map((c) => (
              <option key={key(c)} value={key(c)}>
                {c.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={t('mode')}>
        {(p) => (
          <Select {...p} value={mode} onChange={(e) => setMode(e.target.value as ImproveMode)}>
            {IMPROVE_MODES.map((m) => (
              <option key={m} value={m}>
                {t(`modes.${m}`)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {!selected?.text.trim() && <Note>{t('writeFirst')}</Note>}
      <Run
        loading={request.loading}
        disabled={!selected?.text.trim()}
        onClick={() => {
          setSource(selected ? key(selected) : '');
          void run();
        }}
      >
        {t('run')}
      </Run>
      <AiStatusLine
        loading={request.loading}
        error={request.error}
        onRetry={() => void request.retry()}
        onCancel={request.reset}
      />
      {request.data && selected && source === key(selected) && (
        <>
          <Suggestion
            key={request.data.text}
            original={selected.text}
            suggested={request.data.text}
            onAccept={(text) => {
              actions.updateEntry(selected.section, selected.id, {
                [selected.field]: text.slice(0, 8000),
              } as Partial<ListEntry>);
              toast.success(t('applied'));
              request.reset();
            }}
            onReject={request.reset}
            onRegenerate={() => void run()}
          />
          <Bullets title={t('changes')} items={request.data.changes} />
        </>
      )}
    </div>
  );
}

// ---------- Skills ----------
export function SkillsTask({ resume }: { resume: Resume }) {
  const t = useTranslations('ai.skills');
  const request = useAiRequest('suggest-skills');
  const [checked, setChecked] = useState<string[]>([]);
  const existing = resume.data.skills.map((s) => s.name.trim()).filter(Boolean);
  const context = resumeContext(resume) || resume.targetRole;
  const offered =
    request.data?.skills.filter(
      (s) => !existing.some((e) => e.toLocaleLowerCase() === s.name.toLocaleLowerCase()),
    ) ?? [];
  return (
    <div className="space-y-3">
      <Note>{t('intro')}</Note>
      <Field label={t('role')}>
        {(p) => (
          <Input
            {...p}
            maxLength={300}
            value={resume.targetRole}
            onChange={(e) => actions.setMeta({ targetRole: e.target.value })}
          />
        )}
      </Field>
      {!resume.targetRole.trim() && <Note>{t('needRole')}</Note>}
      <Run
        loading={request.loading}
        disabled={!resume.targetRole.trim()}
        onClick={() => {
          setChecked([]);
          void request.run({
            language: resume.language,
            context,
            targetRole: resume.targetRole,
            existing,
          });
        }}
      >
        {t('run')}
      </Run>
      <AiStatusLine
        loading={request.loading}
        error={request.error}
        onRetry={() => void request.retry()}
        onCancel={request.reset}
      />
      {request.data && offered.length === 0 && <Note>{t('nothing')}</Note>}
      {offered.length > 0 && (
        <>
          <ul className="divide-border border-border bg-surface divide-y rounded-lg border">
            {offered.map((skill) => (
              <li key={skill.name}>
                <label className="flex cursor-pointer gap-3 p-3 text-sm">
                  <input
                    type="checkbox"
                    className="accent-primary mt-0.5 size-4"
                    checked={checked.includes(skill.name)}
                    onChange={(e) =>
                      setChecked(
                        e.target.checked
                          ? [...checked, skill.name]
                          : checked.filter((n) => n !== skill.name),
                      )
                    }
                  />
                  <span>
                    <span className="font-medium">{skill.name}</span>
                    <span className="text-muted-foreground block text-xs">{skill.reason}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <Button
            variant="primary"
            disabled={!checked.length}
            onClick={() => {
              for (const skill of offered.filter((s) => checked.includes(s.name))) {
                actions.addEntry('skills', {
                  name: skill.name.slice(0, 300),
                  category: skill.category.slice(0, 300),
                });
              }
              toast.success(t('added', { count: checked.length }));
              setChecked([]);
            }}
          >
            <Plus />
            {t('add', { count: checked.length })}
          </Button>
        </>
      )}
    </div>
  );
}

// ---------- Review ----------
export function ReviewResult({ resume }: { resume: Resume }) {
  const t = useTranslations('ai.review');
  const request = useAiRequest('review-resume');
  const context = resumeContext(resume);
  return (
    <div className="space-y-3">
      <Note>{t('intro')}</Note>
      <Run
        loading={request.loading}
        disabled={!context}
        onClick={() =>
          void request.run({ language: resume.language, context, targetRole: resume.targetRole })
        }
      >
        {t('run')}
      </Run>
      <AiStatusLine
        loading={request.loading}
        error={request.error as AiErrorCode | null}
        onRetry={() => void request.retry()}
        onCancel={request.reset}
      />
      {request.data && (
        <>
          <p className="text-sm">{request.data.overall}</p>
          <ul className="space-y-2">
            {request.data.items.map((item, i) => (
              <li key={i} className="border-border bg-surface rounded-md border p-3 text-sm">
                <p className="text-muted-foreground text-xs font-semibold">
                  {t(`areas.${item.area}`)} · {t(`priority.${item.priority}`)}
                </p>
                <p className="mt-1">{item.finding}</p>
                <p className="mt-1 font-medium">{item.recommendation}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
