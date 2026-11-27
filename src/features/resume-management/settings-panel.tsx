'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { FileDown, KeyRound, Trash2, Upload } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { LOCALE_NAMES, useSwitchLocale } from '@/components/layout/preferences';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/field';
import { ConfirmDialog } from '@/components/ui/overlays';
import {
  refreshApiKey,
  removeApiKey,
  requestApiKey,
  useApiKeyHint,
} from '@/features/ai-assistant/api-key';
import { revokeConsent, useConsent } from '@/features/ai-assistant/client';
import { routing, type Locale } from '@/i18n/routing';
import { db, deleteAllData } from '@/lib/storage/db';
import { setTheme, useTheme, type Theme } from '@/lib/theme';
import { useBackup } from './use-backup';

function Row({ title, body, children }: { title: string; body?: ReactNode; children: ReactNode }) {
  return (
    <div className="border-border flex flex-wrap items-center justify-between gap-4 border-b py-5">
      <div className="max-w-md">
        <h3 className="font-medium">{title}</h3>
        {body && <p className="text-muted-foreground mt-1 text-sm">{body}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function SettingsPanel() {
  const t = useTranslations('settings');
  const theme = useTheme();
  const tTheme = useTranslations('theme');
  const locale = useLocale() as Locale;
  const switchLocale = useSwitchLocale();
  const backup = useBackup();
  const count = useLiveQuery(() => db.resumes.count().catch(() => 0));
  const letters = useLiveQuery(() => db.letters.count().catch(() => 0));
  const consent = useConsent();
  const apiKey = useApiKeyHint();
  const tKey = useTranslations('apiKey');
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [usage, setUsage] = useState<number | null>(null);

  useEffect(() => {
    void navigator.storage?.estimate?.().then((e) => setUsage(e.usage ?? null));
  }, [count]);

  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="title-page">{t('title')}</h1>

      <h2 className="title-panel mt-8">{t('appearance')}</h2>
      <Row title={tTheme('label')} body={t('themeNote')}>
        <Segmented<Theme>
          label={tTheme('label')}
          value={theme}
          onChange={setTheme}
          options={(['light', 'dark', 'system'] as const).map((v) => ({
            value: v,
            label: tTheme(v),
          }))}
        />
      </Row>
      <Row title={t('language')} body={t('languageNote')}>
        <Segmented<Locale>
          label={t('language')}
          value={locale}
          onChange={switchLocale}
          options={routing.locales.map((v) => ({ value: v, label: LOCALE_NAMES[v] }))}
        />
      </Row>

      <h2 className="title-panel mt-10">{t('data')}</h2>
      <Row
        title={`${t('stored', { count: count ?? 0 })} · ${t('storedLetters', { count: letters ?? 0 })}`}
        body={usage === null ? t('storedNote') : t('usage', { size: (usage / 1048576).toFixed(1) })}
      >
        <Button onClick={backup.openImport}>
          <Upload />
          {t('import')}
        </Button>
        <Button onClick={() => void backup.exportAll()}>
          <FileDown />
          {t('exportAll')}
        </Button>
      </Row>
      {backup.fileInput}
      <Row title={t('deleteAll')} body={t('deleteAllNote')}>
        <Button variant="danger" onClick={() => setConfirming(true)}>
          <Trash2 />
          {t('deleteAll')}
        </Button>
      </Row>

      <section id="api-key" aria-labelledby="api-key-title" className="mt-10 scroll-mt-20">
        <h2 id="api-key-title" className="title-panel">
          {tKey('section')}
        </h2>
        <Row
          title={tKey('yours')}
          body={
            <>
              {apiKey ? (
                <span className="text-foreground block font-medium tracking-wide">
                  {tKey('current', { key: apiKey })}
                </span>
              ) : (
                apiKey === '' && <span className="block">{tKey('none')}</span>
              )}
              <span className="mt-1 block">{tKey('settingsNote')}</span>
            </>
          }
        >
          {apiKey ? (
            <>
              <Button onClick={() => void requestApiKey()}>{tKey('update')}</Button>
              <Button variant="ghost" className="text-danger" onClick={() => setRemoving(true)}>
                {tKey('remove')}
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              disabled={apiKey === null}
              onClick={() => void requestApiKey()}
            >
              <KeyRound />
              {tKey('add')}
            </Button>
          )}
        </Row>
        <Row title={t('permission')} body={t('permissionNote')}>
          <Button disabled={!consent} onClick={revokeConsent}>
            {t(consent ? 'revoke' : 'notGiven')}
          </Button>
        </Row>
      </section>

      <section id="privacy" className="mt-10 scroll-mt-20">
        <h2 className="title-panel">{t('privacyTitle')}</h2>
        <ul className="text-muted-foreground mt-3 list-disc space-y-2 pl-5 text-sm">
          {['local', 'loss', 'aiSend', 'key', 'noTracking'].map((key) => (
            <li key={key}>{t(`privacy.${key}`)}</li>
          ))}
        </ul>
      </section>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('deleteAllTitle')}
        description={t('deleteAllBody', { count: count ?? 0 })}
        confirmLabel={t('deleteAll')}
        onConfirm={() =>
          void deleteAllData().then(
            () => {
              // The key and permission went too; show that straight away.
              revokeConsent();
              refreshApiKey();
              toast.success(t('deleted'));
            },
            () => toast.error(t('deleteFailed')),
          )
        }
      />
      <ConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        title={tKey('removeTitle')}
        description={tKey('removeBody')}
        confirmLabel={tKey('remove')}
        onConfirm={() => {
          removeApiKey();
          toast.success(tKey('removed'));
        }}
      />
    </div>
  );
}
