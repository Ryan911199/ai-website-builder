import { useEffect, useState } from 'react';
import { Loader2, RotateCcw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Snapshot {
  id: string;
  projectId: string;
  files: string;
  messageId: string | null;
  createdAt: Date;
}

interface VersionHistoryProps {
  projectId: string | null;
  onRestore?: (snapshotId: string) => void;
}

export function VersionHistory({ projectId, onRestore }: VersionHistoryProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!projectId) {
      setSnapshots([]);
      return;
    }

    async function fetchSnapshots() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/projects/${projectId}/snapshots`);
        if (!response.ok) {
          throw new Error('Failed to fetch snapshots');
        }
        const data = await response.json();
        
        const parsedSnapshots = data.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt)
        })).sort((a: Snapshot, b: Snapshot) => 
          b.createdAt.getTime() - a.createdAt.getTime()
        );
        
        setSnapshots(parsedSnapshots);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchSnapshots();
  }, [projectId, retryCount]);

  const handleRestore = async (snapshotId: string) => {
    if (!projectId) return;
    
    setRestoringId(snapshotId);
    try {
      const response = await fetch(`/api/projects/${projectId}/snapshots/${snapshotId}/restore`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to restore snapshot');
      }

      toast.success('Snapshot restored successfully');
      onRestore?.(snapshotId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to restore snapshot');
    } finally {
      setRestoringId(null);
    }
  };

  if (!projectId) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-muted-foreground text-sm">
        Select a project to view history
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm text-destructive mb-2">{error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setRetryCount(c => c + 1)}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {snapshots.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No snapshots yet.</p>
          </div>
        ) : (
          snapshots.map((snapshot) => (
            <Card 
              key={snapshot.id}
              className="p-3 flex items-center justify-between group hover:bg-accent/50 transition-colors"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-sm font-medium truncate">
                  {formatRelativeTime(snapshot.createdAt)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {snapshot.createdAt.toLocaleString()}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRestore(snapshot.id)}
                disabled={restoringId !== null}
                title="Restore this version"
              >
                {restoringId === snapshot.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
              </Button>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }
  
  return date.toLocaleDateString();
}
