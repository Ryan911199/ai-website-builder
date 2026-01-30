import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getProject } from '@/lib/projects';
import { createSnapshot, listSnapshots } from '@/lib/projects/snapshots';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
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

    const body = await request.json();
    const { files, messageId } = body;

    // Validate files is an object (not null, not array)
    if (!files || typeof files !== 'object' || Array.isArray(files)) {
      return NextResponse.json(
        { error: 'Files must be an object' },
        { status: 400 }
      );
    }

    // Validate files object is not empty
    if (Object.keys(files).length === 0) {
      return NextResponse.json(
        { error: 'Files object cannot be empty' },
        { status: 400 }
      );
    }

    const snapshot = await createSnapshot(id, files, messageId);

    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    console.error('Create snapshot error:', error);
     return NextResponse.json(
       { error: 'Internal server error' },
       { status: 500 }
     );
   }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
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

    const snapshots = await listSnapshots(id);

    return NextResponse.json(snapshots, { status: 200 });
  } catch (error) {
    console.error('List snapshots error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
