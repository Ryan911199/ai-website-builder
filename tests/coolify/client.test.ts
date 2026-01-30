import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CoolifyClient, CreateAppConfig } from '@/lib/coolify/client';

const mockFetch = vi.fn();

describe('CoolifyClient', () => {
  let client: CoolifyClient;

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    client = new CoolifyClient('https://coolify.example.com', 'test-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should normalize base URL by removing trailing slash', () => {
      const clientWithSlash = new CoolifyClient('https://coolify.example.com/', 'token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ uuid: 'test-uuid', domains: 'test.coolify.app' }),
      });

      const config: CreateAppConfig = {
        project_uuid: 'proj-uuid',
        server_uuid: 'server-uuid',
        environment_name: 'production',
        git_repository: 'https://github.com/user/repo',
        git_branch: 'main',
        build_pack: 'static',
        ports_exposes: '80',
        publish_directory: '/dist',
        is_static: true,
        instant_deploy: false,
      };

      clientWithSlash.createApplication(config);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://coolify.example.com/api/v1/applications/public',
        expect.any(Object)
      );
    });
  });

  describe('createApplication', () => {
    const validConfig: CreateAppConfig = {
      project_uuid: 'proj-uuid',
      server_uuid: 'server-uuid',
      environment_name: 'production',
      git_repository: 'https://github.com/user/repo',
      git_branch: 'main',
      build_pack: 'static',
      ports_exposes: '80',
      publish_directory: '/dist',
      is_static: true,
      instant_deploy: false,
    };

    it('should create application successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ uuid: 'app-uuid', domains: 'app.coolify.app' }),
      });

      const result = await client.createApplication(validConfig);

      expect(result.uuid).toBe('app-uuid');
      expect(result.domains).toBe('app.coolify.app');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://coolify.example.com/api/v1/applications/public',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad request'),
      });

      await expect(client.createApplication(validConfig)).rejects.toThrow(
        'Coolify API error: 400 - Bad request'
      );
    });
  });

  describe('deploy', () => {
    it('should trigger deployment and return deployment UUID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            deployments: [
              {
                message: 'Deployment started',
                resource_uuid: 'app-uuid',
                deployment_uuid: 'deploy-uuid',
              },
            ],
          }),
      });

      const result = await client.deploy('app-uuid');

      expect(result).toBe('deploy-uuid');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://coolify.example.com/api/v1/deploy?uuid=app-uuid',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token' },
        })
      );
    });

    it('should throw error when no deployment started', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deployments: [] }),
      });

      await expect(client.deploy('app-uuid')).rejects.toThrow('No deployment started');
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server error'),
      });

      await expect(client.deploy('app-uuid')).rejects.toThrow('Coolify deploy error: 500');
    });
  });

  describe('getDeploymentStatus', () => {
    it('should return deployment status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 123,
            deployment_uuid: 'deploy-uuid',
            status: 'finished',
            commit: 'abc123',
          }),
      });

      const result = await client.getDeploymentStatus('deploy-uuid');

      expect(result.status).toBe('finished');
      expect(result.deployment_uuid).toBe('deploy-uuid');
    });
  });

  describe('waitForDeployment', () => {
    it('should return finished when deployment completes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'finished' }),
      });

      const result = await client.waitForDeployment('deploy-uuid', 10000);

      expect(result).toBe('finished');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://coolify.example.com/api/v1/deployments/deploy-uuid',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token' },
        })
      );
    });

    it('should return failed when deployment fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'failed' }),
      });

      const result = await client.waitForDeployment('deploy-uuid');

      expect(result).toBe('failed');
    });

    it('should throw timeout error when deployment takes too long', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'in_progress' }),
      });

      await expect(client.waitForDeployment('deploy-uuid', 100)).rejects.toThrow(
        'Deployment timeout'
      );
    });
  });

  describe('getApplicationDetails', () => {
    it('should return application details with fqdn', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            uuid: 'app-uuid',
            fqdn: 'https://myapp.coolify.app',
            status: 'running',
          }),
      });

      const result = await client.getApplicationDetails('app-uuid');

      expect(result.uuid).toBe('app-uuid');
      expect(result.fqdn).toBe('https://myapp.coolify.app');
    });
  });

  describe('deployApplication', () => {
    const validConfig: CreateAppConfig = {
      project_uuid: 'proj-uuid',
      server_uuid: 'server-uuid',
      environment_name: 'production',
      git_repository: 'https://github.com/user/repo',
      git_branch: 'main',
      build_pack: 'static',
      ports_exposes: '80',
      publish_directory: '/dist',
      is_static: true,
      instant_deploy: false,
    };

    it('should complete full deployment flow successfully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ uuid: 'app-uuid', domains: 'app.coolify.app' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              deployments: [{ deployment_uuid: 'deploy-uuid' }],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'finished' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ uuid: 'app-uuid', fqdn: 'https://live.coolify.app' }),
        });

      const result = await client.deployApplication(validConfig);

      expect(result.success).toBe(true);
      expect(result.appUuid).toBe('app-uuid');
      expect(result.liveUrl).toBe('https://live.coolify.app');
    });

    it('should return error on deployment failure', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ uuid: 'app-uuid', domains: 'app.coolify.app' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              deployments: [{ deployment_uuid: 'deploy-uuid' }],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'failed' }),
        });

      const result = await client.deployApplication(validConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Deployment failed');
    });

    it('should return error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      const result = await client.deployApplication(validConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Coolify API error');
    });
  });

  describe('validateCredentials', () => {
    it('should return true for valid credentials', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const result = await client.validateCredentials();

      expect(result).toBe(true);
    });

    it('should return false for invalid credentials', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const result = await client.validateCredentials();

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.validateCredentials();

      expect(result).toBe(false);
    });
  });
});
