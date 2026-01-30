import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createCoolifyClient, CreateAppConfig } from '@/lib/coolify/client';

export interface DeployToCoolifyRequest {
  repoUrl: string;
  projectUuid: string;
  serverUuid: string;
  coolifyUrl: string;
  coolifyToken: string;
  environmentName?: string;
  gitBranch?: string;
}

export interface DeployToCoolifyResponse {
  success: boolean;
  appUuid?: string;
  liveUrl?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json<DeployToCoolifyResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: DeployToCoolifyRequest = await request.json();
    const {
      repoUrl,
      projectUuid,
      serverUuid,
      coolifyUrl,
      coolifyToken,
      environmentName = 'production',
      gitBranch = 'main',
    } = body;

    if (!repoUrl || !projectUuid || !serverUuid || !coolifyUrl || !coolifyToken) {
      return NextResponse.json<DeployToCoolifyResponse>(
        {
          success: false,
          error: 'Missing required fields: repoUrl, projectUuid, serverUuid, coolifyUrl, coolifyToken',
        },
        { status: 400 }
      );
    }

    const coolifyClient = createCoolifyClient(coolifyUrl, coolifyToken);

    const isValid = await coolifyClient.validateCredentials();
    if (!isValid) {
      return NextResponse.json<DeployToCoolifyResponse>(
        { success: false, error: 'Invalid Coolify credentials' },
        { status: 401 }
      );
    }

    const config: CreateAppConfig = {
      project_uuid: projectUuid,
      server_uuid: serverUuid,
      environment_name: environmentName,
      git_repository: repoUrl,
      git_branch: gitBranch,
      build_pack: 'static',
      ports_exposes: '80',
      publish_directory: '/dist',
      is_static: true,
      instant_deploy: false,
    };

    const result = await coolifyClient.deployApplication(config);

    if (!result.success) {
      return NextResponse.json<DeployToCoolifyResponse>(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json<DeployToCoolifyResponse>({
      success: true,
      appUuid: result.appUuid,
      liveUrl: result.liveUrl,
    });
  } catch (error) {
    console.error('Coolify deploy error:', error);
    return NextResponse.json<DeployToCoolifyResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
