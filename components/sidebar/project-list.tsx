import { useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Project } from '@/lib/projects';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProjectListProps {
  onProjectSelect?: (projectId: string) => void;
  onNewProject?: () => void;
}

export function ProjectList({ onProjectSelect, onNewProject }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch('/api/projects');
        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }
        const data = await response.json();
        
        const parsedProjects = data.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt)
        })).sort((a: Project, b: Project) => 
          b.updatedAt.getTime() - a.updatedAt.getTime()
        );
        
        setProjects(parsedProjects);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

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
        <p className="text-sm text-destructive mb-2">{error}</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 border-b">
        <Button onClick={onNewProject} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {projects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No projects yet.</p>
            <p className="text-xs mt-1">Create your first project!</p>
          </div>
        ) : (
          projects.map((project) => (
            <Card 
              key={project.id}
              className="p-3 cursor-pointer hover:bg-accent transition-colors group"
              onClick={() => onProjectSelect?.(project.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium truncate pr-2 group-hover:text-accent-foreground">
                  {project.name}
                </h3>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-5 shrink-0",
                    project.type === 'react' 
                      ? "bg-blue-100 text-blue-700 hover:bg-blue-100/80 dark:bg-blue-900/30 dark:text-blue-300" 
                      : "bg-green-100 text-green-700 hover:bg-green-100/80 dark:bg-green-900/30 dark:text-green-300"
                  )}
                >
                  {project.type === 'react' ? 'React' : 'Static'}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Updated {formatRelativeTime(new Date(project.updatedAt))}
              </div>
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
