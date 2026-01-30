export interface CreateAppConfig {
  project_uuid: string;
  server_uuid: string;
  environment_name: string;
  git_repository: string;
  git_branch: string;
  build_pack: 'static' | 'dockerfile' | 'nixpacks';
  ports_exposes: string;
  publish_directory: string;
  is_static: boolean;
  instant_deploy: boolean;
}

export interface CreateAppResponse {
  uuid: string;
  domains: string;
}

export interface DeployResponse {
  deployments: Array<{
    message: string;
    resource_uuid: string;
    deployment_uuid: string;
  }>;
}

export interface DeploymentStatus {
  id: number;
  deployment_uuid: string;
  status: 'queued' | 'in_progress' | 'finished' | 'failed';
  commit?: string;
}

export interface ApplicationDetails {
  uuid: string;
  fqdn?: string;
  status?: string;
  git_repository?: string;
  git_branch?: string;
  [key: string]: unknown;
}

export interface DeployResult {
  success: boolean;
  appUuid?: string;
  domain?: string;
  liveUrl?: string;
  error?: string;
}

const POLL_INTERVAL_MS = 3000;
const DEFAULT_TIMEOUT_MS = 180000;

export class CoolifyClient {
  private readonly normalizedBaseUrl: string;

  constructor(
    baseUrl: string,
    private token: string
  ) {
    this.normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  }

  async createApplication(config: CreateAppConfig): Promise<CreateAppResponse> {
    const res = await fetch(`${this.normalizedBaseUrl}/api/v1/applications/public`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Coolify API error: ${res.status} - ${errorText}`);
    }

    return res.json();
  }

  async deploy(appUuid: string): Promise<string> {
    const res = await fetch(`${this.normalizedBaseUrl}/api/v1/deploy?uuid=${appUuid}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Coolify deploy error: ${res.status} - ${errorText}`);
    }

    const data: DeployResponse = await res.json();

    if (!data.deployments || data.deployments.length === 0) {
      throw new Error('No deployment started');
    }

    return data.deployments[0].deployment_uuid;
  }

  async getDeploymentStatus(deployUuid: string): Promise<DeploymentStatus> {
    const res = await fetch(`${this.normalizedBaseUrl}/api/v1/deployments/${deployUuid}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Coolify status error: ${res.status} - ${errorText}`);
    }

    return res.json();
  }

  async waitForDeployment(
    deployUuid: string,
    timeoutMs: number = DEFAULT_TIMEOUT_MS
  ): Promise<'finished' | 'failed'> {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const data = await this.getDeploymentStatus(deployUuid);

      if (data.status === 'finished' || data.status === 'failed') {
        return data.status;
      }

      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }

    throw new Error('Deployment timeout');
  }

  async getApplicationDetails(appUuid: string): Promise<ApplicationDetails> {
    const res = await fetch(`${this.normalizedBaseUrl}/api/v1/applications/${appUuid}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Coolify app details error: ${res.status} - ${errorText}`);
    }

    return res.json();
  }

  async deployApplication(config: CreateAppConfig): Promise<DeployResult> {
    try {
      const app = await this.createApplication(config);
      const deployUuid = await this.deploy(app.uuid);
      const status = await this.waitForDeployment(deployUuid);

      if (status === 'failed') {
        return {
          success: false,
          appUuid: app.uuid,
          error: 'Deployment failed',
        };
      }

      const appDetails = await this.getApplicationDetails(app.uuid);

      return {
        success: true,
        appUuid: app.uuid,
        domain: app.domains,
        liveUrl: appDetails.fqdn || app.domains,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const res = await fetch(`${this.normalizedBaseUrl}/api/v1/applications`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export function createCoolifyClient(baseUrl: string, token: string): CoolifyClient {
  return new CoolifyClient(baseUrl, token);
}

export function createCoolifyClientFromEnv(): CoolifyClient | null {
  const baseUrl = process.env.COOLIFY_URL;
  const token = process.env.COOLIFY_TOKEN;

  if (!baseUrl || !token) {
    return null;
  }

  return new CoolifyClient(baseUrl, token);
}
