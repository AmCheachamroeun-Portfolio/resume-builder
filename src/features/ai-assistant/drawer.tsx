'use client';

import { X } from 'lucide-react';
import { motion, MotionConfig } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/field';
import type { Resume } from '@/types/resume';
import { AtsTask } from './ats-task';
import { AiGate } from './parts';
import { ASSISTANT_TASKS, useAssistant, type AssistantTask } from './store';
import { TailorTask } from './tailor-task';
import { ChatTask, ImproveTask, ReviewResult, SkillsTask, SummaryTask } from './tasks';

type Message = { role: 'user' | 'model'; text: string };
/** Keeps the conversation while the panel moves or is closed, until the editor is left. */
let kept: { resumeId: string; messages: Message[]; job: string } = {
  resumeId: '',
  messages: [],
  job: '',
};

/**
 * A non-modal panel, so the document stays editable while it is open. The editor
 * decides where it sits, so it never covers the page on a wide screen.
 */
export function AssistantPanel({ resume }: { resume: Resume }) {
  const t = useTranslations('ai');
  const { task, setTask, close } = useAssistant();
  const [messages, setMessages] = useState<Message[]>(() =>
    kept.resumeId === resume.id ? kept.messages : [],
  );
  const [job, setJob] = useState(() => (kept.resumeId === resume.id ? kept.job : ''));
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    kept = { messages, job, resumeId: resume.id };
  }, [messages, job, resume.id]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => opener?.focus?.();
  }, []);

  const content = {
    chat: () => <ChatTask resume={resume} messages={messages} setMessages={setMessages} />,
    summary: () => <SummaryTask resume={resume} />,
    improve: () => <ImproveTask resume={resume} />,
    skills: () => <SkillsTask resume={resume} />,
    tailor: () => <TailorTask resume={resume} job={job} setJob={setJob} />,
    review: () => <ReviewResult resume={resume} />,
    ats: () => <AtsTask resume={resume} job={job} setJob={setJob} />,
  };

  return (
    <MotionConfig reducedMotion="user">
      <motion.aside
        ref={panel}
        tabIndex={-1}
        aria-label={t('title')}
        initial={{ x: 16, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        onKeyDown={(e) => e.key === 'Escape' && close()}
        className="flex min-h-0 flex-1 flex-col outline-none"
      >
        <div className="border-border border-b p-3">
          <div className="flex items-center justify-between">
            <h2 className="title-panel">{t('title')}</h2>
            <Button variant="ghost" size="icon-sm" aria-label={t('close')} onClick={close}>
              <X />
            </Button>
          </div>
          <Select
            className="mt-2"
            aria-label={t('taskLabel')}
            value={task}
            onChange={(e) => setTask(e.target.value as AssistantTask)}
          >
            {ASSISTANT_TASKS.map((id) => (
              <option key={id} value={id}>
                {t(`tasks.${id}`)}
              </option>
            ))}
          </Select>
        </div>
        <div data-native-undo className="bg-panel min-h-0 flex-1 overflow-y-auto p-3">
          {/* The compatibility check is rule based. Job matching starts on the device
              too, and asks for consent only around its AI part. */}
          {task === 'ats' || task === 'tailor' ? (
            content[task]()
          ) : (
            <AiGate key={task}>{content[task]()}</AiGate>
          )}
        </div>
      </motion.aside>
    </MotionConfig>
  );
}
