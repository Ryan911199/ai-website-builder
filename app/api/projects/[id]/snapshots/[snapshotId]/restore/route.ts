import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getProject } from '@/lib/projects';
import { getSnapshot } from '@/lib/projects/snapshots';
import { saveArtifacts, ArtifactInput } from '@/lib/projects/artifacts';

/**
 * Infer language from file extension
 */
function inferLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';

  const languageMap: Record<string, string> = {
    tsx: 'typescript',
    ts: 'typescript',
    jsx: 'javascript',
    js: 'javascript',
    css: 'css',
    scss: 'scss',
    html: 'html',
    json: 'json',
    md: 'markdown',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
    php: 'php',
    sql: 'sql',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    sh: 'bash',
    bash: 'bash',
  };

  return languageMap[ext] || 'text';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; snapshotId: string }> }
) {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, snapshotId } = await params;

    // Validate project exists and user owns it
    const project = await getProject(id);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.userId !== session.userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get snapshot
    const snapshot = await getSnapshot(snapshotId);

    if (!snapshot) {
      return NextResponse.json(
        { error: 'Snapshot not found' },
        { status: 404 }
      );
    }

    // Validate snapshot belongs to this project
    if (snapshot.projectId !== id) {
      return NextResponse.json(
        { error: 'Snapshot does not belong to this project' },
        { status: 403 }
      );
    }

    // Parse snapshot files
    let filesObject: Record<string, string>;
    try {
      filesObject = JSON.parse(snapshot.files);
    } catch (error) {
      console.error('Failed to parse snapshot files:', error);
      return NextResponse.json(
        { error: 'Invalid snapshot data' },
        { status: 500 }
      );
    }

    // Convert to artifacts format
    const artifacts: ArtifactInput[] = Object.entries(filesObject).map(
      ([path, content]) => ({
        path,
        content: typeof content === 'string' ? content : String(content),
        language: inferLanguage(path),
      })
    );

    if (artifacts.length === 0) {
      return NextResponse.json(
        { error: 'Snapshot contains no files' },
        { status: 400 }
      );
    }

    // Save artifacts
    const savedArtifacts = await saveArtifacts(id, artifacts);

    return NextResponse.json(savedArtifacts, { status: 200 });
  } catch (error) {
    console.error('Restore snapshot error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
