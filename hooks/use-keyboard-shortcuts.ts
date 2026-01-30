'use client';

import { useEffect } from 'react';

export interface UseKeyboardShortcutsOptions {
  onSave?: () => void;
  onCommandPalette?: () => void;
  enabled?: boolean;
}

/**
 * Hook for handling common keyboard shortcuts
 * - Cmd+S (Mac) / Ctrl+S (Windows) for save
 * - Cmd+K (Mac) / Ctrl+K (Windows) for command palette
 * 
 * Prevents default browser behavior and skips shortcuts in input fields
 */
export function useKeyboardShortcuts(
  options: UseKeyboardShortcutsOptions
): void {
  const { onSave, onCommandPalette, enabled = true } = options;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if target is an input, textarea, or contenteditable element
      const target = event.target as HTMLElement;
      const isEditableElement =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true';

      if (isEditableElement) {
        return;
      }

      // Detect if we're on Mac (Cmd key) or Windows/Linux (Ctrl key)
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      // Cmd+S / Ctrl+S for save
      if (modifier && event.key === 's') {
        event.preventDefault();
        onSave?.();
      }

      // Cmd+K / Ctrl+K for command palette
      if (modifier && event.key === 'k') {
        event.preventDefault();
        onCommandPalette?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onSave, onCommandPalette]);
}
