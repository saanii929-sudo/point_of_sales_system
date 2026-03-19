'use client';

import { useEffect } from 'react';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Safety check for event.key
      if (!event.key) return;
      
      for (const shortcut of shortcuts) {
        // Safety check for shortcut.key
        if (!shortcut.key) continue;
        
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          ctrlMatch &&
          shiftMatch &&
          altMatch
        ) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

// POS-specific keyboard shortcuts
export const POS_SHORTCUTS: ShortcutConfig[] = [
  {
    key: 'f',
    ctrl: true,
    description: 'Focus search',
    action: () => {
      const searchInput = document.querySelector<HTMLInputElement>('input[type="text"]');
      searchInput?.focus();
    }
  },
  {
    key: 'Enter',
    ctrl: true,
    description: 'Checkout',
    action: () => {
      const checkoutBtn = document.querySelector<HTMLButtonElement>('[data-action="checkout"]');
      checkoutBtn?.click();
    }
  },
  {
    key: 'h',
    ctrl: true,
    description: 'Hold cart',
    action: () => {
      const holdBtn = document.querySelector<HTMLButtonElement>('[data-action="hold"]');
      holdBtn?.click();
    }
  },
  {
    key: 'r',
    ctrl: true,
    description: 'Resume cart',
    action: () => {
      const resumeBtn = document.querySelector<HTMLButtonElement>('[data-action="resume"]');
      resumeBtn?.click();
    }
  },
  {
    key: 'Escape',
    description: 'Clear cart',
    action: () => {
      const clearBtn = document.querySelector<HTMLButtonElement>('[data-action="clear"]');
      clearBtn?.click();
    }
  },
  {
    key: 'p',
    ctrl: true,
    description: 'Print receipt',
    action: () => {
      window.print();
    }
  },
  {
    key: 'c',
    ctrl: true,
    shift: true,
    description: 'Open calculator',
    action: () => {
      const calcBtn = document.querySelector<HTMLButtonElement>('[data-action="calculator"]');
      calcBtn?.click();
    }
  }
];
