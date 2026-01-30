import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Cmd+S / Ctrl+S save shortcut', () => {
    it('should trigger save callback on Cmd+S on Mac', () => {
      const onSave = vi.fn();
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');

      renderHook(() =>
        useKeyboardShortcuts({
          onSave,
          enabled: true,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('should trigger save callback on Ctrl+S on Windows', () => {
      const onSave = vi.fn();
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32');

      renderHook(() =>
        useKeyboardShortcuts({
          onSave,
          enabled: true,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('should prevent default browser save behavior on Cmd+S', () => {
      const onSave = vi.fn();
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');

      renderHook(() =>
        useKeyboardShortcuts({
          onSave,
          enabled: true,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true,
      });

      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should prevent default browser save behavior on Ctrl+S', () => {
      const onSave = vi.fn();
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32');

      renderHook(() =>
        useKeyboardShortcuts({
          onSave,
          enabled: true,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
      });

      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Cmd+K / Ctrl+K command palette shortcut', () => {
    it('should trigger command palette callback on Cmd+K on Mac', () => {
      const onCommandPalette = vi.fn();
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');

      renderHook(() =>
        useKeyboardShortcuts({
          onCommandPalette,
          enabled: true,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(onCommandPalette).toHaveBeenCalledTimes(1);
    });

    it('should trigger command palette callback on Ctrl+K on Windows', () => {
      const onCommandPalette = vi.fn();
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32');

      renderHook(() =>
        useKeyboardShortcuts({
          onCommandPalette,
          enabled: true,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(onCommandPalette).toHaveBeenCalledTimes(1);
    });

    it('should prevent default behavior on Cmd+K', () => {
      const onCommandPalette = vi.fn();
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');

      renderHook(() =>
        useKeyboardShortcuts({
          onCommandPalette,
          enabled: true,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });

      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should prevent default behavior on Ctrl+K', () => {
      const onCommandPalette = vi.fn();
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32');

      renderHook(() =>
        useKeyboardShortcuts({
          onCommandPalette,
          enabled: true,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });

      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Input field handling', () => {
    it('should not trigger save callback when typing in input field', () => {
      const onSave = vi.fn();
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');

      renderHook(() =>
        useKeyboardShortcuts({
          onSave,
          enabled: true,
        })
      );

      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true,
      });

      Object.defineProperty(event, 'target', { value: input, enumerable: true });
      window.dispatchEvent(event);

      expect(onSave).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });

    it('should not trigger command palette callback when typing in textarea', () => {
      const onCommandPalette = vi.fn();
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');

      renderHook(() =>
        useKeyboardShortcuts({
          onCommandPalette,
          enabled: true,
        })
      );

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });

      Object.defineProperty(event, 'target', { value: textarea, enumerable: true });
      window.dispatchEvent(event);

      expect(onCommandPalette).not.toHaveBeenCalled();

      document.body.removeChild(textarea);
    });

    it('should not trigger shortcuts in contenteditable elements', () => {
      const onSave = vi.fn();
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');

      renderHook(() =>
        useKeyboardShortcuts({
          onSave,
          enabled: true,
        })
      );

      const div = document.createElement('div');
      div.contentEditable = 'true';
      document.body.appendChild(div);
      div.focus();

      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true,
      });

      Object.defineProperty(event, 'target', { value: div, enumerable: true });
      window.dispatchEvent(event);

      expect(onSave).not.toHaveBeenCalled();

      document.body.removeChild(div);
    });
  });

  describe('Enabled/Disabled state', () => {
    it('should not trigger callbacks when disabled', () => {
      const onSave = vi.fn();
      const onCommandPalette = vi.fn();
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');

      renderHook(() =>
        useKeyboardShortcuts({
          onSave,
          onCommandPalette,
          enabled: false,
        })
      );

      const saveEvent = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true,
      });

      const paletteEvent = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });

      window.dispatchEvent(saveEvent);
      window.dispatchEvent(paletteEvent);

      expect(onSave).not.toHaveBeenCalled();
      expect(onCommandPalette).not.toHaveBeenCalled();
    });

    it('should trigger callbacks when enabled is true', () => {
      const onSave = vi.fn();
      const onCommandPalette = vi.fn();
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');

      renderHook(() =>
        useKeyboardShortcuts({
          onSave,
          onCommandPalette,
          enabled: true,
        })
      );

      const saveEvent = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true,
      });

      const paletteEvent = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });

      window.dispatchEvent(saveEvent);
      window.dispatchEvent(paletteEvent);

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onCommandPalette).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event listener cleanup', () => {
    it('should remove event listener on unmount', () => {
      const onSave = vi.fn();
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');

      const { unmount } = renderHook(() =>
        useKeyboardShortcuts({
          onSave,
          enabled: true,
        })
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
    });

    it('should not trigger callbacks after unmount', () => {
      const onSave = vi.fn();
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');

      const { unmount } = renderHook(() =>
        useKeyboardShortcuts({
          onSave,
          enabled: true,
        })
      );

      unmount();

      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('Platform detection', () => {
    it('should detect Mac platform correctly', () => {
      const onSave = vi.fn();
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');

      renderHook(() =>
        useKeyboardShortcuts({
          onSave,
          enabled: true,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        ctrlKey: false,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('should detect Windows platform correctly', () => {
      const onSave = vi.fn();
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32');

      renderHook(() =>
        useKeyboardShortcuts({
          onSave,
          enabled: true,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: false,
        ctrlKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('should work with metaKey on non-Windows platforms', () => {
      const onSave = vi.fn();
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');

      renderHook(() =>
        useKeyboardShortcuts({
          onSave,
          enabled: true,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });

  describe('Optional callbacks', () => {
    it('should handle missing onSave callback', () => {
      const onCommandPalette = vi.fn();
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');

      renderHook(() =>
        useKeyboardShortcuts({
          onCommandPalette,
          enabled: true,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true,
      });

      expect(() => {
        window.dispatchEvent(event);
      }).not.toThrow();
    });

    it('should handle missing onCommandPalette callback', () => {
      const onSave = vi.fn();
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');

      renderHook(() =>
        useKeyboardShortcuts({
          onSave,
          enabled: true,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });

      expect(() => {
        window.dispatchEvent(event);
      }).not.toThrow();
    });

    it('should handle both callbacks being undefined', () => {
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');

      renderHook(() =>
        useKeyboardShortcuts({
          enabled: true,
        })
      );

      const saveEvent = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true,
      });

      const paletteEvent = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });

      expect(() => {
        window.dispatchEvent(saveEvent);
        window.dispatchEvent(paletteEvent);
      }).not.toThrow();
    });
  });

  describe('Default enabled state', () => {
    it('should be enabled by default', () => {
      const onSave = vi.fn();
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');

      renderHook(() =>
        useKeyboardShortcuts({
          onSave,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });

  describe('Other key combinations', () => {
    it('should not trigger on Cmd+A', () => {
      const onSave = vi.fn();
      const onCommandPalette = vi.fn();
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');

      renderHook(() =>
        useKeyboardShortcuts({
          onSave,
          onCommandPalette,
          enabled: true,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'a',
        metaKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(onSave).not.toHaveBeenCalled();
      expect(onCommandPalette).not.toHaveBeenCalled();
    });

    it('should not trigger on Cmd+C', () => {
      const onSave = vi.fn();
      const onCommandPalette = vi.fn();
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');

      renderHook(() =>
        useKeyboardShortcuts({
          onSave,
          onCommandPalette,
          enabled: true,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'c',
        metaKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(onSave).not.toHaveBeenCalled();
      expect(onCommandPalette).not.toHaveBeenCalled();
    });

    it('should not trigger on S without modifier', () => {
      const onSave = vi.fn();
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');

      renderHook(() =>
        useKeyboardShortcuts({
          onSave,
          enabled: true,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: false,
        ctrlKey: false,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(onSave).not.toHaveBeenCalled();
    });
  });
});
