import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { artifacts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createGitHubClient, GitHubFile } from '@/lib/github/client';

export interface PushToGitHubRequest {
  projectId: string;
  repoName: string;
  githubToken: string;
  isPrivate?: boolean;
}

export interface PushToGitHubResponse {
  success: boolean;
  repoUrl?: string;
  error?: string;
  commitSha?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body: PushToGitHubRequest = await request.json();
    const { projectId, repoName, githubToken, isPrivate = false } = body;

    if (!projectId || !repoName || !githubToken) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: projectId, repoName, githubToken' },
        { status: 400 }
      );
    }

    const projectArtifacts = await db
      .select()
      .from(artifacts)
      .where(eq(artifacts.projectId, projectId));

    if (projectArtifacts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files found for this project' },
        { status: 404 }
      );
    }

    const files: GitHubFile[] = projectArtifacts.map((artifact) => ({
      path: artifact.filePath,
      content: artifact.content,
    }));

    const githubClient = createGitHubClient(githubToken);

    const isValid = await githubClient.validateToken();
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid GitHub token' },
        { status: 401 }
      );
    }

    const result = await githubClient.pushFiles(
      repoName,
      files,
      'Deploy from AI Website Builder'
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      repoUrl: result.repoUrl,
      commitSha: result.commitSha,
    });
  } catch (error) {
    console.error('GitHub push error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
