import { Octokit } from '@octokit/rest';

export interface GitHubFile {
  path: string;
  content: string;
}

export interface PushResult {
  success: boolean;
  repoUrl?: string;
  error?: string;
  commitSha?: string;
}

export interface CreateRepoResult {
  success: boolean;
  repoUrl?: string;
  error?: string;
}

/**
 * GitHub client wrapper for repository operations
 */
export class GitHubClient {
  private octokit: Octokit;
  private username: string | null = null;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  /**
   * Get authenticated user's username
   */
  async getUsername(): Promise<string> {
    if (this.username) {
      return this.username;
    }

    try {
      const { data } = await this.octokit.rest.users.getAuthenticated();
      this.username = data.login;
      return this.username;
    } catch (error) {
      throw new Error(
        `Failed to get authenticated user: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if repository exists
   */
  async repoExists(owner: string, repo: string): Promise<boolean> {
    try {
      await this.octokit.rest.repos.get({ owner, repo });
      return true;
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Create a new repository
   */
  async createRepo(
    repoName: string,
    description?: string,
    isPrivate: boolean = false
  ): Promise<CreateRepoResult> {
    try {
      const { data } = await this.octokit.rest.repos.createForAuthenticatedUser({
        name: repoName,
        description: description || `AI-generated website: ${repoName}`,
        private: isPrivate,
        auto_init: false, // Don't create README, we'll push our own files
      });

      return {
        success: true,
        repoUrl: data.html_url,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create repository',
      };
    }
  }

  /**
   * Get or create repository
   */
  async getOrCreateRepo(
    repoName: string,
    description?: string,
    isPrivate: boolean = false
  ): Promise<CreateRepoResult> {
    try {
      const username = await this.getUsername();
      const exists = await this.repoExists(username, repoName);

      if (exists) {
        return {
          success: true,
          repoUrl: `https://github.com/${username}/${repoName}`,
        };
      }

      return await this.createRepo(repoName, description, isPrivate);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get or create repository',
      };
    }
  }

  /**
   * Push multiple files to repository
   * Creates individual commits for each file
   */
  async pushFiles(
    repoName: string,
    files: GitHubFile[],
    commitMessage: string = 'Initial commit from AI Website Builder'
  ): Promise<PushResult> {
    try {
      const username = await this.getUsername();

      // Ensure repo exists
      const repoResult = await this.getOrCreateRepo(repoName);
      if (!repoResult.success) {
        return {
          success: false,
          error: repoResult.error,
        };
      }

      let lastCommitSha: string | undefined;

      // Push each file individually
      for (const file of files) {
        try {
          const { data } = await this.octokit.rest.repos.createOrUpdateFileContents({
            owner: username,
            repo: repoName,
            path: file.path,
            message: `${commitMessage}: ${file.path}`,
            content: Buffer.from(file.content).toString('base64'),
            committer: {
              name: 'AI Website Builder',
              email: 'ai-builder@example.com',
            },
          });

          lastCommitSha = data.commit.sha;
        } catch (error: any) {
          // If file exists, get its SHA and update
          if (error.status === 422) {
            try {
              const { data: existing } = await this.octokit.rest.repos.getContent({
                owner: username,
                repo: repoName,
                path: file.path,
              });

              if ('sha' in existing) {
                const { data } = await this.octokit.rest.repos.createOrUpdateFileContents({
                  owner: username,
                  repo: repoName,
                  path: file.path,
                  message: `Update ${file.path}`,
                  content: Buffer.from(file.content).toString('base64'),
                  sha: existing.sha,
                  committer: {
                    name: 'AI Website Builder',
                    email: 'ai-builder@example.com',
                  },
                });

                lastCommitSha = data.commit.sha;
              }
            } catch (updateError: any) {
              throw new Error(`Failed to update ${file.path}: ${updateError.message}`);
            }
          } else {
            throw error;
          }
        }
      }

      return {
        success: true,
        repoUrl: `https://github.com/${username}/${repoName}`,
        commitSha: lastCommitSha,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to push files',
      };
    }
  }

  /**
   * Validate GitHub token
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.octokit.rest.users.getAuthenticated();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a GitHub client instance
 */
export function createGitHubClient(token: string): GitHubClient {
  return new GitHubClient(token);
}
