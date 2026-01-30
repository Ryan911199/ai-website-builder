import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubClient } from '@/lib/github/client';

const mockOctokitInstance = {
  rest: {
    users: {
      getAuthenticated: vi.fn().mockResolvedValue({
        data: { login: 'testuser' },
      }),
    },
    repos: {
      get: vi.fn(),
      createForAuthenticatedUser: vi.fn(),
      createOrUpdateFileContents: vi.fn(),
      getContent: vi.fn(),
    },
  },
};

vi.mock('@octokit/rest', () => {
  return {
    Octokit: vi.fn(function() {
      return mockOctokitInstance;
    }),
  };
});

describe('GitHubClient', () => {
  let client: GitHubClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new GitHubClient('test-token');
  });

  describe('getUsername', () => {
    it('should return authenticated username', async () => {
      const username = await client.getUsername();
      expect(username).toBe('testuser');
      expect(mockOctokitInstance.rest.users.getAuthenticated).toHaveBeenCalled();
    });

    it('should cache username after first call', async () => {
      await client.getUsername();
      await client.getUsername();
      expect(mockOctokitInstance.rest.users.getAuthenticated).toHaveBeenCalledTimes(1);
    });
  });

  describe('repoExists', () => {
    it('should return true if repo exists', async () => {
      mockOctokitInstance.rest.repos.get.mockResolvedValue({ data: {} });
      const exists = await client.repoExists('testuser', 'test-repo');
      expect(exists).toBe(true);
    });

    it('should return false if repo does not exist', async () => {
      mockOctokitInstance.rest.repos.get.mockRejectedValue({ status: 404 });
      const exists = await client.repoExists('testuser', 'test-repo');
      expect(exists).toBe(false);
    });

    it('should throw error for non-404 errors', async () => {
      mockOctokitInstance.rest.repos.get.mockRejectedValue({ status: 500 });
      await expect(client.repoExists('testuser', 'test-repo')).rejects.toThrow();
    });
  });

  describe('createRepo', () => {
    it('should create repository successfully', async () => {
      mockOctokitInstance.rest.repos.createForAuthenticatedUser.mockResolvedValue({
        data: { html_url: 'https://github.com/testuser/test-repo' },
      });

      const result = await client.createRepo('test-repo', 'Test description');
      expect(result.success).toBe(true);
      expect(result.repoUrl).toBe('https://github.com/testuser/test-repo');
    });

    it('should handle creation errors', async () => {
      mockOctokitInstance.rest.repos.createForAuthenticatedUser.mockRejectedValue(
        new Error('Repository already exists')
      );

      const result = await client.createRepo('test-repo');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Repository already exists');
    });
  });

  describe('pushFiles', () => {
    beforeEach(() => {
      mockOctokitInstance.rest.repos.get.mockResolvedValue({ data: {} });
      mockOctokitInstance.rest.repos.createOrUpdateFileContents.mockResolvedValue({
        data: {
          commit: { sha: 'abc123' },
          content: { path: 'test.txt' },
        },
      });
    });

    it('should push files successfully', async () => {
      const files = [
        { path: 'index.html', content: '<html></html>' },
        { path: 'style.css', content: 'body {}' },
      ];

      const result = await client.pushFiles('test-repo', files);
      expect(result.success).toBe(true);
      expect(result.repoUrl).toBe('https://github.com/testuser/test-repo');
      expect(result.commitSha).toBe('abc123');
      expect(mockOctokitInstance.rest.repos.createOrUpdateFileContents).toHaveBeenCalledTimes(2);
    });

    it('should update existing files', async () => {
      mockOctokitInstance.rest.repos.createOrUpdateFileContents
        .mockRejectedValueOnce({ status: 422 })
        .mockResolvedValueOnce({
          data: {
            commit: { sha: 'def456' },
            content: { path: 'index.html' },
          },
        });

      mockOctokitInstance.rest.repos.getContent.mockResolvedValue({
        data: { sha: 'old-sha' },
      });

      const files = [{ path: 'index.html', content: '<html>Updated</html>' }];
      const result = await client.pushFiles('test-repo', files);

      expect(result.success).toBe(true);
      expect(mockOctokitInstance.rest.repos.getContent).toHaveBeenCalled();
    });

    it('should handle push errors', async () => {
      mockOctokitInstance.rest.repos.createOrUpdateFileContents.mockRejectedValue(
        new Error('Network error')
      );

      const files = [{ path: 'index.html', content: '<html></html>' }];
      const result = await client.pushFiles('test-repo', files);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('validateToken', () => {
    it('should return true for valid token', async () => {
      const isValid = await client.validateToken();
      expect(isValid).toBe(true);
    });

    it('should return false for invalid token', async () => {
      mockOctokitInstance.rest.users.getAuthenticated.mockRejectedValue(new Error('Unauthorized'));
      const isValid = await client.validateToken();
      expect(isValid).toBe(false);
    });
  });
});
