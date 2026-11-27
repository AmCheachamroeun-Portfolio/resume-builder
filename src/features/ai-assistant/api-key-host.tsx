'use client';

import dynamic from 'next/dynamic';
import { useKeyDialog } from './api-key';

// Loaded only when it is first needed, so ordinary pages do not carry it.
const ApiKeyDialog = dynamic(() => import('./api-key-dialog').then((m) => m.ApiKeyDialog), {
  ssr: false,
});

/** The one place the key setup dialog is mounted, shared by every screen. */
export function ApiKeyHost() {
  const open = useKeyDialog((state) => state.open);
  return open ? <ApiKeyDialog /> : null;
}
