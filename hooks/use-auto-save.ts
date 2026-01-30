'use client';

import { useEffect, useRef, useState } from 'react';

export interface ArtifactFile {
  path: string;
  content: string;
  language: string;
}

export interface UseAutoSaveOptions {
  projectId: string | null;
  files: ArtifactFile[];
  enabled?: boolean;
  interval?: number;
}

export interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  error: string | null;
}

function filesEqual(
  prev: ArtifactFile[] | undefined,
  current: ArtifactFile[]
): boolean {
  if (!prev) return false;
  if (prev.length !== current.length) return false;

  return prev.every((prevFile, index) => {
    const currentFile = current[index];
    return (
      prevFile.path === currentFile.path &&
      prevFile.content === currentFile.content &&
      prevFile.language === currentFile.language
    );
  });
}

export function useAutoSave(options: UseAutoSaveOptions): UseAutoSaveReturn {
  const {
    projectId,
    files,
    enabled = true,
    interval = 30000,
  } = options;

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previousFilesRef = useRef<ArtifactFile[] | undefined>(undefined);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  const performSave = async () => {
    if (!enabled || !projectId || files.length === 0) {
      return;
    }

    if (filesEqual(previousFilesRef.current, files)) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/artifacts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ files }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}`
        );
      }

      previousFilesRef.current = JSON.parse(JSON.stringify(files));
      setLastSaved(new Date());
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    if (!enabled || !projectId) {
      return;
    }

    intervalIdRef.current = setInterval(() => {
      performSave();
    }, interval);

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [enabled, projectId, interval]);

  useEffect(() => {
    // Intentionally empty - previousFilesRef is updated after successful save
  }, [files]);

  return {
    isSaving,
    lastSaved,
    error,
  };
}
