'use client';

import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useThemeStore } from '@/store/useThemeStore';
import { useServiceWorker } from '@/hooks/useServiceWorker';

export function Providers({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore(state => state.theme);

  // Register service worker for offline support
  useServiceWorker();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: theme === 'dark' ? '#1F2937' : '#FFFFFF',
            color: theme === 'dark' ? '#F3F4F6' : '#111827',
          },
        }}
      />
    </>
  );
}
