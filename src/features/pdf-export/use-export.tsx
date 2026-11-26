'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { Resume } from '@/types/resume';

// The dialog and its preview are only downloaded when someone exports.
const ExportDialog = dynamic(() => import('./export-dialog'), { ssr: false });

/** Opens the export dialog for a resume. Render `dialog` once in the caller. */
export function useExport() {
  const [resume, setResume] = useState<Resume | null>(null);
  const dialog = resume && <ExportDialog resume={resume} onClose={() => setResume(null)} />;
  return { request: setResume, dialog };
}
