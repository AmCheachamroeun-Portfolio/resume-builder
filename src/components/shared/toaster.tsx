'use client';

import { Toaster } from 'sonner';
import { useTheme } from '@/lib/theme';

export function AppToaster() {
  const theme = useTheme();
  return (
    <Toaster
      theme={theme}
      position="bottom-center"
      toastOptions={{ style: { borderRadius: 6, fontFamily: 'var(--font-sans)' } }}
    />
  );
}
