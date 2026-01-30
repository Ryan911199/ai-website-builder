'use client';

import { useState } from 'react';
import { GitHubPushButton } from './github-push-button';
import { CoolifyDeployButton } from './coolify-deploy-button';

interface DeploymentPanelProps {
  projectId: string;
  projectName: string;
  hasFiles: boolean;
}

export function DeploymentPanel({ projectId, projectName, hasFiles }: DeploymentPanelProps) {
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);

  if (!hasFiles) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 p-2 border-t bg-muted/30">
      {!repoUrl && (
        <GitHubPushButton
          projectId={projectId}
          projectName={projectName}
          onPushSuccess={setRepoUrl}
        />
      )}

      {repoUrl && !liveUrl && <CoolifyDeployButton repoUrl={repoUrl} onDeployComplete={setLiveUrl} />}

      {repoUrl && (
        <a
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-500 hover:underline"
        >
          View on GitHub
        </a>
      )}

      {liveUrl && (
        <a
          href={liveUrl.startsWith('http') ? liveUrl : `https://${liveUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-green-500 hover:underline font-semibold"
        >
          Live Site
        </a>
      )}
    </div>
  );
}
