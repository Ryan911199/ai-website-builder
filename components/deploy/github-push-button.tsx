'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GitHubPushButtonProps {
  projectId: string;
  projectName: string;
}

export function GitHubPushButton({ projectId, projectName }: GitHubPushButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [repoName, setRepoName] = useState(projectName.toLowerCase().replace(/\s+/g, '-'));
  const [githubToken, setGithubToken] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    repoUrl?: string;
    error?: string;
  } | null>(null);

  const handlePush = async () => {
    if (!repoName || !githubToken) {
      setResult({ success: false, error: 'Repository name and GitHub token are required' });
      return;
    }

    setIsPushing(true);
    setResult(null);

    try {
      const response = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          repoName,
          githubToken,
          isPrivate,
        }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        setTimeout(() => {
          setIsOpen(false);
          setResult(null);
        }, 3000);
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to push to GitHub',
      });
    } finally {
      setIsPushing(false);
    }
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} variant="outline">
        Push to GitHub
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h2 className="text-xl font-semibold mb-4">Push to GitHub</h2>

        <div className="space-y-4">
          <div>
            <Label htmlFor="repoName">Repository Name</Label>
            <Input
              id="repoName"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="my-awesome-website"
              disabled={isPushing}
            />
          </div>

          <div>
            <Label htmlFor="githubToken">
              GitHub Personal Access Token
              <a
                href="https://github.com/settings/tokens/new?scopes=repo"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-xs text-blue-500 hover:underline"
              >
                (Create token)
              </a>
            </Label>
            <Input
              id="githubToken"
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              disabled={isPushing}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              disabled={isPushing}
              className="w-4 h-4"
            />
            <Label htmlFor="isPrivate" className="cursor-pointer">
              Make repository private
            </Label>
          </div>

          {result && (
            <div
              className={`p-3 rounded ${
                result.success
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}
            >
              {result.success ? (
                <div>
                  <p className="font-semibold">Success!</p>
                  {result.repoUrl && (
                    <a
                      href={result.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm underline"
                    >
                      View repository
                    </a>
                  )}
                </div>
              ) : (
                <p>{result.error}</p>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button onClick={() => setIsOpen(false)} variant="outline" disabled={isPushing}>
              Cancel
            </Button>
            <Button onClick={handlePush} disabled={isPushing || !repoName || !githubToken}>
              {isPushing ? 'Pushing...' : 'Push to GitHub'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
