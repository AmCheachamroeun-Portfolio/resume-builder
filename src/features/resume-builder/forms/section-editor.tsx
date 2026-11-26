'use client';

import { Plus, Trash2, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { ConfirmDialog } from '@/components/ui/overlays';
import { useAssistant } from '@/features/ai-assistant/store';
import { createId } from '@/lib/utils';
import { actions } from '@/stores/editor-store';
import type { CustomSection, ListSectionKey, Resume } from '@/types/resume';
import { useSectionTitle } from '../use-section-title';
import { CollapsibleEntries, EntryList, useOpenIds, useRemovedToast } from './entry-list';
import { DateInput, RichInput } from './inputs';
import { PersonalForm } from './personal-form';

function SummaryForm({ resume }: { resume: Resume }) {
  const t = useTranslations('fields.summary');
  const form = useTranslations('form');
  const openAssistant = useAssistant((s) => s.openFor);
  return (
    <div className="space-y-5">
      {(['professional', 'about', 'objective'] as const).map((name) => (
        <RichInput
          key={name}
          label={t(name)}
          value={resume.data.summary[name]}
          onChange={(value) => actions.setSummary({ [name]: value })}
          assistLabel={form('write')}
          onAssist={name === 'professional' ? () => openAssistant('summary') : undefined}
        />
      ))}
    </div>
  );
}

function CustomForm({ section, onRemoved }: { section: CustomSection; onRemoved: () => void }) {
  const t = useTranslations('fields.custom');
  const form = useTranslations('form');
  const { openIds, setOpen } = useOpenIds();
  const [confirming, setConfirming] = useState(false);
  const removed = useRemovedToast();
  const setItems = (items: CustomSection['items']) =>
    actions.updateCustomSection(section.id, { items });

  return (
    <div className="space-y-4">
      <Field label={t('sectionTitle')}>
        {(props) => (
          <Input
            {...props}
            maxLength={300}
            value={section.title}
            onChange={(e) => actions.updateCustomSection(section.id, { title: e.target.value })}
          />
        )}
      </Field>
      <CollapsibleEntries
        items={section.items}
        describe={(item) => ({ title: item.title, subtitle: item.subtitle })}
        onMove={(from, to) => {
          const items = [...section.items];
          items.splice(to, 0, ...items.splice(from, 1));
          setItems(items);
        }}
        onRemove={(item) => {
          setItems(section.items.filter((i) => i.id !== item.id));
          removed();
        }}
        openIds={openIds}
        setOpen={setOpen}
        renderBody={(item) => {
          const patch = (change: Partial<typeof item>) =>
            setItems(section.items.map((i) => (i.id === item.id ? { ...i, ...change } : i)));
          return (
            <div className="grid gap-4 sm:grid-cols-2">
              {(['title', 'subtitle'] as const).map((name) => (
                <Field key={name} label={t(name)}>
                  {(props) => (
                    <Input
                      {...props}
                      maxLength={300}
                      value={item[name]}
                      onChange={(e) => patch({ [name]: e.target.value })}
                    />
                  )}
                </Field>
              ))}
              <DateInput label={t('date')} value={item.date} onChange={(date) => patch({ date })} />
              <div className="sm:col-span-2">
                <RichInput
                  label={t('description')}
                  value={item.description}
                  onChange={(description) => patch({ description })}
                />
              </div>
            </div>
          );
        }}
      />
      <div className="flex flex-wrap justify-between gap-2">
        <Button
          disabled={section.items.length >= 60}
          onClick={() => {
            const id = createId();
            setItems([
              ...section.items,
              { id, title: '', subtitle: '', date: '', description: '' },
            ]);
            setOpen(id, true);
          }}
        >
          <Plus />
          {t('addItem')}
        </Button>
        <Button variant="ghost" className="text-danger" onClick={() => setConfirming(true)}>
          <Trash2 />
          {t('removeSection')}
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('removeSection')}
        description={form('removeSectionBody', { name: section.title })}
        confirmLabel={t('removeSection')}
        onConfirm={() => {
          actions.removeCustomSection(section.id);
          onRemoved();
        }}
      />
    </div>
  );
}

export function SectionEditor({
  resume,
  selected,
  onSelect,
}: {
  resume: Resume;
  selected: string;
  onSelect: (key: string) => void;
}) {
  const t = useTranslations('editor');
  const title = useSectionTitle(resume);
  const state = resume.sections.find((s) => s.key === selected);
  const custom = resume.data.custom.find((c) => `custom:${c.id}` === selected);
  const heading = selected === 'personal' ? t('personal') : title(selected);

  return (
    <div className="mx-auto w-full max-w-2xl p-4 sm:p-5">
      <h2 className="display text-xl">{heading}</h2>
      <p className="text-muted-foreground mt-1 mb-5 text-sm">{t('emptyHidden')}</p>
      {state && !state.visible && (
        <div className="bg-warning-soft text-warning mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2 text-sm">
          <span className="flex items-center gap-2">
            <EyeOff aria-hidden className="size-4" />
            {t('hiddenNotice')}
          </span>
          <Button size="sm" onClick={() => actions.toggleSection(selected)}>
            {t('showSection')}
          </Button>
        </div>
      )}
      {selected === 'personal' ? (
        <PersonalForm key={resume.id} resume={resume} />
      ) : selected === 'summary' ? (
        <SummaryForm resume={resume} />
      ) : selected.startsWith('custom:') ? (
        custom ? (
          <CustomForm key={custom.id} section={custom} onRemoved={() => onSelect('personal')} />
        ) : (
          <p className="text-muted-foreground text-sm">{t('sectionGone')}</p>
        )
      ) : (
        <EntryList key={selected} section={selected as ListSectionKey} resume={resume} />
      )}
    </div>
  );
}
