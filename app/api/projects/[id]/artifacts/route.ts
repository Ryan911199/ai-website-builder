import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getProject } from '@/lib/projects';
import { saveArtifacts } from '@/lib/projects/artifacts';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const project = await getProject(params.id);

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

    const body = await request.json();
    const { files } = body;

    if (!Array.isArray(files)) {
      return NextResponse.json(
        { error: 'Files must be an array' },
        { status: 400 }
      );
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'Files array cannot be empty' },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (!file.path || typeof file.path !== 'string') {
        return NextResponse.json(
          { error: 'Each file must have a path (string)' },
          { status: 400 }
        );
      }

      if (!file.content || typeof file.content !== 'string') {
        return NextResponse.json(
          { error: 'Each file must have content (string)' },
          { status: 400 }
        );
      }

      if (!file.language || typeof file.language !== 'string') {
        return NextResponse.json(
          { error: 'Each file must have a language (string)' },
          { status: 400 }
        );
      }
    }

    const artifacts = await saveArtifacts(params.id, files);

    return NextResponse.json(artifacts, { status: 200 });
  } catch (error) {
    console.error('Save artifacts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
