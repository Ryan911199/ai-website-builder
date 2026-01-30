import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAutoSave, ArtifactFile } from '@/hooks/use-auto-save';

const mockFiles: ArtifactFile[] = [
  {
    path: 'index.html',
    content: '<html><body>Hello</body></html>',
    language: 'html',
  },
  {
    path: 'style.css',
    content: 'body { color: red; }',
    language: 'css',
  },
];

const mockProjectId = 'proj-123';

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() =>
        useAutoSave({
          projectId: mockProjectId,
          files: mockFiles,
        })
      );

      expect(result.current.isSaving).toBe(false);
      expect(result.current.lastSaved).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should accept custom interval', () => {
      const { result } = renderHook(() =>
        useAutoSave({
          projectId: mockProjectId,
          files: mockFiles,
          interval: 60000,
        })
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('save conditions', () => {
    it('should not save when enabled is false', () => {
      renderHook(() =>
        useAutoSave({
          projectId: mockProjectId,
          files: mockFiles,
          enabled: false,
        })
      );

      vi.advanceTimersByTime(30000);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should not save when projectId is null', () => {
      renderHook(() =>
        useAutoSave({
          projectId: null,
          files: mockFiles,
          enabled: true,
        })
      );

      vi.advanceTimersByTime(30000);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should not save when files array is empty', () => {
      renderHook(() =>
        useAutoSave({
          projectId: mockProjectId,
          files: [],
          enabled: true,
        })
      );

      vi.advanceTimersByTime(30000);

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('auto-save trigger', () => {
    it('should save after 30 seconds by default', () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      renderHook(() =>
        useAutoSave({
          projectId: mockProjectId,
          files: mockFiles,
          enabled: true,
        })
      );

      vi.advanceTimersByTime(30000);

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/projects/${mockProjectId}/artifacts`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: mockFiles }),
        })
      );
    });

    it('should save at custom interval', () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      renderHook(() =>
        useAutoSave({
          projectId: mockProjectId,
          files: mockFiles,
          enabled: true,
          interval: 60000,
        })
      );

      vi.advanceTimersByTime(30000);
      expect(global.fetch).not.toHaveBeenCalled();

      vi.advanceTimersByTime(30000);
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('change detection', () => {
    it('should save when files change', () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const { rerender } = renderHook(
        ({ files }) =>
          useAutoSave({
            projectId: mockProjectId,
            files,
            enabled: true,
          }),
        { initialProps: { files: mockFiles } }
      );

      vi.advanceTimersByTime(30000);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      const newFiles: ArtifactFile[] = [
        {
          path: 'index.html',
          content: '<html><body>Updated</body></html>',
          language: 'html',
        },
      ];

      rerender({ files: newFiles });
      vi.advanceTimersByTime(30000);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should detect content changes', () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const { rerender } = renderHook(
        ({ files }) =>
          useAutoSave({
            projectId: mockProjectId,
            files,
            enabled: true,
          }),
        { initialProps: { files: mockFiles } }
      );

      vi.advanceTimersByTime(30000);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      const modifiedFiles = [
        {
          ...mockFiles[0],
          content: '<html><body>Modified</body></html>',
        },
        mockFiles[1],
      ];

      rerender({ files: modifiedFiles });
      vi.advanceTimersByTime(30000);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('state management', () => {
    it('should initialize with isSaving false', () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const { result } = renderHook(() =>
        useAutoSave({
          projectId: mockProjectId,
          files: mockFiles,
          enabled: true,
        })
      );

      expect(result.current.isSaving).toBe(false);
    });

    it('should have lastSaved null initially', () => {
      const { result } = renderHook(() =>
        useAutoSave({
          projectId: mockProjectId,
          files: mockFiles,
          enabled: true,
        })
      );

      expect(result.current.lastSaved).toBeNull();
    });

    it('should have error null initially', () => {
      const { result } = renderHook(() =>
        useAutoSave({
          projectId: mockProjectId,
          files: mockFiles,
          enabled: true,
        })
      );

      expect(result.current.error).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should initialize with error null', () => {
      const { result } = renderHook(() =>
        useAutoSave({
          projectId: mockProjectId,
          files: mockFiles,
          enabled: true,
        })
      );

      expect(result.current.error).toBeNull();
    });

    it('should call fetch with correct error handling', () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      renderHook(() =>
        useAutoSave({
          projectId: mockProjectId,
          files: mockFiles,
          enabled: true,
        })
      );

      vi.advanceTimersByTime(30000);

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should cleanup interval on unmount', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const { unmount } = renderHook(() =>
        useAutoSave({
          projectId: mockProjectId,
          files: mockFiles,
          enabled: true,
        })
      );

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should cleanup interval when enabled changes to false', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const { rerender } = renderHook(
        ({ enabled }) =>
          useAutoSave({
            projectId: mockProjectId,
            files: mockFiles,
            enabled,
          }),
        { initialProps: { enabled: true } }
      );

      rerender({ enabled: false });

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should cleanup interval when projectId changes to null', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const { rerender } = renderHook(
        ({ projectId }: { projectId: string | null }) =>
          useAutoSave({
            projectId,
            files: mockFiles,
            enabled: true,
          }),
        { initialProps: { projectId: mockProjectId as string | null } }
      );

      rerender({ projectId: null });

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should not save after unmount', () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const { unmount } = renderHook(() =>
        useAutoSave({
          projectId: mockProjectId,
          files: mockFiles,
          enabled: true,
        })
      );

      unmount();
      vi.advanceTimersByTime(30000);

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('API request format', () => {
    it('should send correct request format', () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      renderHook(() =>
        useAutoSave({
          projectId: mockProjectId,
          files: mockFiles,
          enabled: true,
        })
      );

      vi.advanceTimersByTime(30000);

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/projects/${mockProjectId}/artifacts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ files: mockFiles }),
        }
      );
    });

    it('should include all file properties in request', () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const customFiles: ArtifactFile[] = [
        {
          path: 'app.tsx',
          content: 'export default function App() {}',
          language: 'typescript',
        },
      ];

      renderHook(() =>
        useAutoSave({
          projectId: mockProjectId,
          files: customFiles,
          enabled: true,
        })
      );

      vi.advanceTimersByTime(30000);

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.files[0]).toEqual({
        path: 'app.tsx',
        content: 'export default function App() {}',
        language: 'typescript',
      });
    });
  });

  describe('multiple saves', () => {
    it('should save when files change between intervals', () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const { rerender } = renderHook(
        ({ files }) =>
          useAutoSave({
            projectId: mockProjectId,
            files,
            enabled: true,
            interval: 10000,
          }),
        { initialProps: { files: mockFiles } }
      );

      vi.advanceTimersByTime(10000);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      const newFiles = [
        {
          ...mockFiles[0],
          content: 'updated',
        },
        mockFiles[1],
      ];

      rerender({ files: newFiles });

      vi.advanceTimersByTime(10000);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
