'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CoolifyDeployButtonProps {
  repoUrl: string;
  onDeployComplete?: (liveUrl: string) => void;
}

interface DeployState {
  status: 'idle' | 'configuring' | 'deploying' | 'success' | 'error';
  liveUrl?: string;
  error?: string;
}

export function CoolifyDeployButton({ repoUrl, onDeployComplete }: CoolifyDeployButtonProps) {
  const [deployState, setDeployState] = useState<DeployState>({ status: 'idle' });
  const [coolifyUrl, setCoolifyUrl] = useState('');
  const [coolifyToken, setCoolifyToken] = useState('');
  const [projectUuid, setProjectUuid] = useState('');
  const [serverUuid, setServerUuid] = useState('');

  useEffect(() => {
    if (deployState.status === 'success' && deployState.liveUrl && onDeployComplete) {
      onDeployComplete(deployState.liveUrl);
    }
  }, [deployState, onDeployComplete]);

  const handleDeploy = async () => {
    if (!coolifyUrl || !coolifyToken || !projectUuid || !serverUuid) {
      setDeployState({
        status: 'error',
        error: 'All Coolify configuration fields are required',
      });
      return;
    }

    setDeployState({ status: 'deploying' });

    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl,
          projectUuid,
          serverUuid,
          coolifyUrl,
          coolifyToken,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setDeployState({ status: 'success', liveUrl: data.liveUrl });
      } else {
        setDeployState({ status: 'error', error: data.error });
      }
    } catch (error) {
      setDeployState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to deploy',
      });
    }
  };

  if (deployState.status === 'idle') {
    return (
      <Button onClick={() => setDeployState({ status: 'configuring' })} variant="default">
        Deploy to Coolify
      </Button>
    );
  }

  if (deployState.status === 'success') {
    return (
      <div className="p-4 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-lg">
        <p className="font-semibold mb-2">Deployment Successful!</p>
        {deployState.liveUrl && (
          <a
            href={deployState.liveUrl.startsWith('http') ? deployState.liveUrl : `https://${deployState.liveUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline hover:text-green-600 dark:hover:text-green-400"
          >
            {deployState.liveUrl}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h2 className="text-xl font-semibold mb-4">Deploy to Coolify</h2>

        <div className="space-y-4">
          <div>
            <Label htmlFor="coolifyUrl">Coolify URL</Label>
            <Input
              id="coolifyUrl"
              value={coolifyUrl}
              onChange={(e) => setCoolifyUrl(e.target.value)}
              placeholder="https://coolify.example.com"
              disabled={deployState.status === 'deploying'}
            />
          </div>

          <div>
            <Label htmlFor="coolifyToken">Coolify API Token</Label>
            <Input
              id="coolifyToken"
              type="password"
              value={coolifyToken}
              onChange={(e) => setCoolifyToken(e.target.value)}
              placeholder="Your Coolify API token"
              disabled={deployState.status === 'deploying'}
            />
          </div>

          <div>
            <Label htmlFor="projectUuid">Project UUID</Label>
            <Input
              id="projectUuid"
              value={projectUuid}
              onChange={(e) => setProjectUuid(e.target.value)}
              placeholder="Coolify project UUID"
              disabled={deployState.status === 'deploying'}
            />
          </div>

          <div>
            <Label htmlFor="serverUuid">Server UUID</Label>
            <Input
              id="serverUuid"
              value={serverUuid}
              onChange={(e) => setServerUuid(e.target.value)}
              placeholder="Coolify server UUID"
              disabled={deployState.status === 'deploying'}
            />
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            Deploying from: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{repoUrl}</code>
          </div>

          {deployState.status === 'error' && (
            <div className="p-3 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
              {deployState.error}
            </div>
          )}

          {deployState.status === 'deploying' && (
            <div className="p-3 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              <p className="font-semibold">Deploying...</p>
              <p className="text-sm">This may take a few minutes. Polling for status...</p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              onClick={() => setDeployState({ status: 'idle' })}
              variant="outline"
              disabled={deployState.status === 'deploying'}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeploy}
              disabled={
                deployState.status === 'deploying' ||
                !coolifyUrl ||
                !coolifyToken ||
                !projectUuid ||
                !serverUuid
              }
            >
              {deployState.status === 'deploying' ? 'Deploying...' : 'Deploy'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
