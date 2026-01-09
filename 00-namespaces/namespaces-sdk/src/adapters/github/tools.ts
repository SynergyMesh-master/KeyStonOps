/**
 * GitHub Tool Wrappers
 * 
 * Implements individual tool wrappers for GitHub operations.
 */

import { Tool, ToolMetadata, ToolContext, ToolDescriptor, ToolFactory } from '../../core/tool';
import { CredentialManager } from '../../credentials/manager';
import { GitHubAdapterConfig } from './index';

/**
 * Base GitHub tool class
 */
abstract class GitHubTool<TInput, TOutput> extends Tool<TInput, TOutput> {
  protected credentialManager: CredentialManager;
  protected config: GitHubAdapterConfig;

  constructor(
    metadata: ToolMetadata,
    credentialManager: CredentialManager,
    config: GitHubAdapterConfig
  ) {
    super(metadata);
    this.credentialManager = credentialManager;
    this.config = config;
  }

  /**
   * Get authenticated GitHub client
   */
  protected async getClient(): Promise<any> {
    const credential = await this.credentialManager.getCredential('github');
    // In real implementation, return Octokit client
    return { credential };
  }
}

/**
 * GitHub Create Issue Tool
 */
class GitHubCreateIssueTool extends GitHubTool<
  { repository: string; title: string; body?: string; labels?: string[] },
  { issue_number: number; url: string }
> {
  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        repository: {
          type: 'string',
          description: 'Repository in format owner/repo',
          pattern: '^[^/]+/[^/]+$'
        },
        title: {
          type: 'string',
          description: 'Issue title',
          minLength: 1
        },
        body: {
          type: 'string',
          description: 'Issue body/description'
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Issue labels'
        }
      },
      required: ['repository', 'title']
    };
  }

  getOutputSchema(): any {
    return {
      type: 'object',
      properties: {
        issue_number: {
          type: 'integer',
          description: 'Created issue number'
        },
        url: {
          type: 'string',
          description: 'Issue URL'
        }
      },
      required: ['issue_number', 'url']
    };
  }

  protected async invoke(input: any, context: ToolContext): Promise<any> {
    const client = await this.getClient();
    const [owner, repo] = input.repository.split('/');

    // In real implementation:
    // const response = await client.rest.issues.create({
    //   owner,
    //   repo,
    //   title: input.title,
    //   body: input.body,
    //   labels: input.labels
    // });

    // Mock response
    return {
      issue_number: 123,
      url: `https://github.com/${input.repository}/issues/123`
    };
  }
}

/**
 * GitHub List Repositories Tool
 */
class GitHubListReposTool extends GitHubTool<
  { org?: string; user?: string; type?: string },
  { repositories: Array<{ name: string; full_name: string; url: string }> }
> {
  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        org: {
          type: 'string',
          description: 'Organization name'
        },
        user: {
          type: 'string',
          description: 'User name'
        },
        type: {
          type: 'string',
          enum: ['all', 'public', 'private'],
          description: 'Repository type filter'
        }
      }
    };
  }

  getOutputSchema(): any {
    return {
      type: 'object',
      properties: {
        repositories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              full_name: { type: 'string' },
              url: { type: 'string' }
            }
          }
        }
      },
      required: ['repositories']
    };
  }

  protected async invoke(input: any, context: ToolContext): Promise<any> {
    const client = await this.getClient();

    // Mock response
    return {
      repositories: [
        {
          name: 'example-repo',
          full_name: 'owner/example-repo',
          url: 'https://github.com/owner/example-repo'
        }
      ]
    };
  }
}

/**
 * GitHub Create Pull Request Tool
 */
class GitHubCreatePRTool extends GitHubTool<
  { repository: string; title: string; head: string; base: string; body?: string },
  { pr_number: number; url: string }
> {
  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        repository: {
          type: 'string',
          description: 'Repository in format owner/repo'
        },
        title: {
          type: 'string',
          description: 'Pull request title'
        },
        head: {
          type: 'string',
          description: 'Head branch name'
        },
        base: {
          type: 'string',
          description: 'Base branch name'
        },
        body: {
          type: 'string',
          description: 'Pull request description'
        }
      },
      required: ['repository', 'title', 'head', 'base']
    };
  }

  getOutputSchema(): any {
    return {
      type: 'object',
      properties: {
        pr_number: { type: 'integer' },
        url: { type: 'string' }
      },
      required: ['pr_number', 'url']
    };
  }

  protected async invoke(input: any, context: ToolContext): Promise<any> {
    const client = await this.getClient();
    
    return {
      pr_number: 456,
      url: `https://github.com/${input.repository}/pull/456`
    };
  }
}

/**
 * GitHub Get File Tool
 */
class GitHubGetFileTool extends GitHubTool<
  { repository: string; path: string; ref?: string },
  { content: string; encoding: string; sha: string }
> {
  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        repository: { type: 'string' },
        path: { type: 'string' },
        ref: { type: 'string', description: 'Branch, tag, or commit SHA' }
      },
      required: ['repository', 'path']
    };
  }

  getOutputSchema(): any {
    return {
      type: 'object',
      properties: {
        content: { type: 'string' },
        encoding: { type: 'string' },
        sha: { type: 'string' }
      },
      required: ['content', 'encoding', 'sha']
    };
  }

  protected async invoke(input: any, context: ToolContext): Promise<any> {
    return {
      content: 'base64-encoded-content',
      encoding: 'base64',
      sha: 'abc123'
    };
  }
}

/**
 * GitHub Commit File Tool
 */
class GitHubCommitFileTool extends GitHubTool<
  { repository: string; path: string; content: string; message: string; branch?: string },
  { commit_sha: string; url: string }
> {
  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        repository: { type: 'string' },
        path: { type: 'string' },
        content: { type: 'string' },
        message: { type: 'string' },
        branch: { type: 'string' }
      },
      required: ['repository', 'path', 'content', 'message']
    };
  }

  getOutputSchema(): any {
    return {
      type: 'object',
      properties: {
        commit_sha: { type: 'string' },
        url: { type: 'string' }
      },
      required: ['commit_sha', 'url']
    };
  }

  protected async invoke(input: any, context: ToolContext): Promise<any> {
    return {
      commit_sha: 'def456',
      url: `https://github.com/${input.repository}/commit/def456`
    };
  }
}

/**
 * Tool factory functions
 */
export function createGitHubCreateIssueTool(
  credentialManager: CredentialManager,
  config: GitHubAdapterConfig
): ToolDescriptor {
  const metadata: ToolMetadata = {
    name: 'github_create_issue',
    title: 'Create GitHub Issue',
    description: 'Creates a new issue in a GitHub repository',
    version: '1.0.0',
    adapter: 'github',
    tags: ['github', 'issue', 'create']
  };

  const factory: ToolFactory = {
    createTool: () => new GitHubCreateIssueTool(metadata, credentialManager, config),
    getToolMetadata: () => metadata
  };

  const tool = factory.createTool();

  return {
    metadata,
    factory,
    inputSchema: tool.getInputSchema(),
    outputSchema: tool.getOutputSchema()
  };
}

export function createGitHubListReposTool(
  credentialManager: CredentialManager,
  config: GitHubAdapterConfig
): ToolDescriptor {
  const metadata: ToolMetadata = {
    name: 'github_list_repos',
    title: 'List GitHub Repositories',
    description: 'Lists repositories for a user or organization',
    version: '1.0.0',
    adapter: 'github',
    tags: ['github', 'repository', 'list']
  };

  const factory: ToolFactory = {
    createTool: () => new GitHubListReposTool(metadata, credentialManager, config),
    getToolMetadata: () => metadata
  };

  const tool = factory.createTool();

  return {
    metadata,
    factory,
    inputSchema: tool.getInputSchema(),
    outputSchema: tool.getOutputSchema()
  };
}

export function createGitHubCreatePRTool(
  credentialManager: CredentialManager,
  config: GitHubAdapterConfig
): ToolDescriptor {
  const metadata: ToolMetadata = {
    name: 'github_create_pr',
    title: 'Create GitHub Pull Request',
    description: 'Creates a new pull request in a GitHub repository',
    version: '1.0.0',
    adapter: 'github',
    tags: ['github', 'pull-request', 'create']
  };

  const factory: ToolFactory = {
    createTool: () => new GitHubCreatePRTool(metadata, credentialManager, config),
    getToolMetadata: () => metadata
  };

  const tool = factory.createTool();

  return {
    metadata,
    factory,
    inputSchema: tool.getInputSchema(),
    outputSchema: tool.getOutputSchema()
  };
}

export function createGitHubGetFileTool(
  credentialManager: CredentialManager,
  config: GitHubAdapterConfig
): ToolDescriptor {
  const metadata: ToolMetadata = {
    name: 'github_get_file',
    title: 'Get GitHub File',
    description: 'Gets the contents of a file from a GitHub repository',
    version: '1.0.0',
    adapter: 'github',
    tags: ['github', 'file', 'read']
  };

  const factory: ToolFactory = {
    createTool: () => new GitHubGetFileTool(metadata, credentialManager, config),
    getToolMetadata: () => metadata
  };

  const tool = factory.createTool();

  return {
    metadata,
    factory,
    inputSchema: tool.getInputSchema(),
    outputSchema: tool.getOutputSchema()
  };
}

export function createGitHubCommitFileTool(
  credentialManager: CredentialManager,
  config: GitHubAdapterConfig
): ToolDescriptor {
  const metadata: ToolMetadata = {
    name: 'github_commit_file',
    title: 'Commit File to GitHub',
    description: 'Commits a file to a GitHub repository',
    version: '1.0.0',
    adapter: 'github',
    tags: ['github', 'file', 'commit']
  };

  const factory: ToolFactory = {
    createTool: () => new GitHubCommitFileTool(metadata, credentialManager, config),
    getToolMetadata: () => metadata
  };

  const tool = factory.createTool();

  return {
    metadata,
    factory,
    inputSchema: tool.getInputSchema(),
    outputSchema: tool.getOutputSchema()
  };
}