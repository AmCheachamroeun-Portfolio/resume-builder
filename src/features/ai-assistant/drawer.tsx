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
import { ChatTask, ImproveTask, ReviewResult, SkillsTask, SummaryTask, TailorTask } from './tasks';

/** A non-modal side panel, so the document stays editable while it is open. */
export function AssistantDrawer({ resume }: { resume: Resume }) {
  const t = useTranslations('ai');
  const { task, setTask, close } = useAssistant();
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [job, setJob] = useState('');
  const panel = useRef<HTMLElement>(null);

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
        initial={{ x: 32, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        onKeyDown={(e) => e.key === 'Escape' && close()}
        className="border-border bg-background shadow-overlay fixed inset-0 z-40 flex flex-col outline-none sm:left-auto sm:w-[26rem] sm:border-l"
      >
        <div className="border-border bg-surface border-b p-3">
          <div className="flex items-center justify-between">
            <h2 className="display text-lg">{t('title')}</h2>
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
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {/* The compatibility check is rule based and needs neither AI nor consent. */}
          {task === 'ats' ? content.ats() : <AiGate key={task}>{content[task]()}</AiGate>}
        </div>
      </motion.aside>
    </MotionConfig>
  );
}
