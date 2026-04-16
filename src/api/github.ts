import { Octokit } from '@octokit/rest';
import { GitHubUser, Repository } from '@/types';

/**
 * GitHub API Integration
 * Provides methods to interact with GitHub API for authentication and repository management
 */
export class GitHubAPI {
  private octokit: Octokit;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(config: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    accessToken?: string;
  }) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri;

    this.octokit = new Octokit({
      auth: config.accessToken,
    });
  }

  /**
   * Get OAuth authorization URL for GitHub login
   */
  getAuthorizationUrl(scopes: string[] = ['user', 'repo', 'gist']): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      allow_signup: 'true',
    });

    return `https://github.com/login/oauth/authorize?${params}`;
  }

  /**
   * Exchange OAuth code for access token
   */
  async getAccessToken(code: string): Promise<string> {
    try {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: this.redirectUri,
        }),
      });

      const data: any = await response.json();

      if (data.error) {
        throw new Error(`GitHub OAuth error: ${data.error_description}`);
      }

      return data.access_token;
    } catch (error: any) {
      throw new Error(`Failed to get GitHub access token: ${error.message}`);
    }
  }

  /**
   * Get authenticated user information
   */
  async getUser(): Promise<GitHubUser> {
    try {
      const response = await this.octokit.rest.users.getAuthenticated();

      return {
        id: response.data.id,
        login: response.data.login,
        name: response.data.name,
        email: response.data.email,
        avatar_url: response.data.avatar_url,
        bio: response.data.bio,
        public_repos: response.data.public_repos,
        followers: response.data.followers,
      };
    } catch (error: any) {
      throw new Error(`Failed to get GitHub user: ${error.message}`);
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<GitHubUser> {
    try {
      const response = await this.octokit.rest.users.getByUsername({ username });

      return {
        id: response.data.id,
        login: response.data.login,
        name: response.data.name,
        email: response.data.email,
        avatar_url: response.data.avatar_url,
        bio: response.data.bio,
        public_repos: response.data.public_repos,
        followers: response.data.followers,
      };
    } catch (error: any) {
      throw new Error(`Failed to get GitHub user ${username}: ${error.message}`);
    }
  }

  /**
   * Get user's repositories
   */
  async getUserRepositories(
    username: string,
    options?: { per_page?: number; page?: number }
  ): Promise<Repository[]> {
    try {
      const response = await this.octokit.rest.repos.listForUser({
        username,
        per_page: options?.per_page || 30,
        page: options?.page || 1,
      });

      return response.data.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        stars: repo.stargazers_count,
        language: repo.language,
        isPrivate: repo.private,
        createdAt: new Date(repo.created_at),
        updatedAt: new Date(repo.updated_at),
      }));
    } catch (error: any) {
      throw new Error(`Failed to get GitHub repositories: ${error.message}`);
    }
  }

  /**
   * Get a specific repository
   */
  async getRepository(owner: string, repo: string): Promise<Repository> {
    try {
      const response = await this.octokit.rest.repos.get({ owner, repo });

      return {
        id: response.data.id,
        name: response.data.name,
        fullName: response.data.full_name,
        description: response.data.description,
        url: response.data.html_url,
        stars: response.data.stargazers_count,
        language: response.data.language,
        isPrivate: response.data.private,
        createdAt: new Date(response.data.created_at),
        updatedAt: new Date(response.data.updated_at),
      };
    } catch (error: any) {
      throw new Error(`Failed to get GitHub repository: ${error.message}`);
    }
  }

  /**
   * Create a new repository
   */
  async createRepository(options: {
    name: string;
    description?: string;
    private?: boolean;
    auto_init?: boolean;
    gitignore_template?: string;
  }): Promise<Repository> {
    try {
      const response = await this.octokit.rest.repos.createForAuthenticatedUser({
        name: options.name,
        description: options.description,
        private: options.private || false,
        auto_init: options.auto_init || true,
        gitignore_template: options.gitignore_template,
      });

      return {
        id: response.data.id,
        name: response.data.name,
        fullName: response.data.full_name,
        description: response.data.description,
        url: response.data.html_url,
        stars: response.data.stargazers_count,
        language: response.data.language,
        isPrivate: response.data.private,
        createdAt: new Date(response.data.created_at),
        updatedAt: new Date(response.data.updated_at),
      };
    } catch (error: any) {
      throw new Error(`Failed to create GitHub repository: ${error.message}`);
    }
  }

  /**
   * Get user's gists
   */
  async getUserGists(username: string): Promise<any[]> {
    try {
      const response = await this.octokit.rest.gists.listForUser({ username });

      return response.data.map((gist: any) => ({
        id: gist.id,
        url: gist.html_url,
        description: gist.description,
        files: Object.keys(gist.files),
        createdAt: new Date(gist.created_at),
        updatedAt: new Date(gist.updated_at),
      }));
    } catch (error: any) {
      throw new Error(`Failed to get GitHub gists: ${error.message}`);
    }
  }

  /**
   * Star a repository
   */
  async starRepository(owner: string, repo: string): Promise<void> {
    try {
      await this.octokit.rest.activity.starRepoForAuthenticatedUser({
        owner,
        repo,
      });
    } catch (error: any) {
      throw new Error(`Failed to star repository: ${error.message}`);
    }
  }

  /**
   * Unstar a repository
   */
  async unstarRepository(owner: string, repo: string): Promise<void> {
    try {
      await this.octokit.rest.activity.unstarRepoForAuthenticatedUser({
        owner,
        repo,
      });
    } catch (error: any) {
      throw new Error(`Failed to unstar repository: ${error.message}`);
    }
  }

  /**
   * Get repository issues
   */
  async getRepositoryIssues(
    owner: string,
    repo: string,
    options?: { state?: 'open' | 'closed' | 'all' }
  ): Promise<any[]> {
    try {
      const response = await this.octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: options?.state || 'open',
      });

      return response.data.map((issue: any) => ({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        body: issue.body,
        state: issue.state,
        creator: issue.user.login,
        createdAt: new Date(issue.created_at),
        updatedAt: new Date(issue.updated_at),
      }));
    } catch (error: any) {
      throw new Error(`Failed to get repository issues: ${error.message}`);
    }
  }

  /**
   * Create a new issue
   */
  async createIssue(
    owner: string,
    repo: string,
    options: { title: string; body?: string; labels?: string[] }
  ): Promise<any> {
    try {
      const response = await this.octokit.rest.issues.create({
        owner,
        repo,
        title: options.title,
        body: options.body,
        labels: options.labels,
      });

      return {
        id: response.data.id,
        number: response.data.number,
        title: response.data.title,
        url: response.data.html_url,
      };
    } catch (error: any) {
      throw new Error(`Failed to create issue: ${error.message}`);
    }
  }
}

/**
 * Create GitHub API instance
 */
export function createGitHubAPI(config: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
}): GitHubAPI {
  return new GitHubAPI(config);
}
