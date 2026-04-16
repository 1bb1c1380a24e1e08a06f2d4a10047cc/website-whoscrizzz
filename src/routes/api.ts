/**
 * API Routes
 *
 * Comprehensive routes for all whoscrizzz.com API integrations:
 * - Authentication (GitHub OAuth, JWT)
 * - Database operations
 * - Email/Notifications
 * - Claude AI
 * - Cloudflare management
 */

import { Hono } from 'hono';
import type { Context } from 'hono';

import {
  createDatabaseAPI,
  createEmailAPI,
  createGitHubAPI,
  createClaudeAPI,
  createAuthAPI,
  createAuthMiddleware,
} from '@/api';

import { loadConfig } from '@/utils/config';

/**
 * Create API routes with all integrations
 */
export function createAPIRoutes(env: any): Hono {
  const app = new Hono();
  const config = loadConfig(env);

  // =========================================================================
  // Middleware
  // =========================================================================

  // CORS middleware
  app.use('*', async (c, next) => {
    c.header('Access-Control-Allow-Origin', 'https://whoscrizzz.com');
    c.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    await next();
  });

  // Request ID middleware
  app.use('*', async (c, next) => {
    c.set('requestId', `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    await next();
  });

  // =========================================================================
  // Health Check
  // =========================================================================

  app.get('/health', (c) => {
    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.environment,
    });
  });

  // =========================================================================
  // Authentication Routes
  // =========================================================================

  const authAPI = createAuthAPI({ secret: env.JWT_SECRET });
  const githubAPI = createGitHubAPI({
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
    redirectUri: env.GITHUB_REDIRECT_URI,
  });

  // GitHub OAuth authorization
  app.get('/auth/github', (c) => {
    const authUrl = githubAPI.getAuthorizationUrl();
    return c.json({ authUrl });
  });

  // GitHub OAuth callback
  app.post('/auth/github/callback', async (c) => {
    const { code } = await c.req.json();

    try {
      const token = await githubAPI.getAccessToken(code);
      const user = await githubAPI.getUser();

      const authTokens = authAPI.generateTokens({
        id: user.login,
        username: user.login,
        email: user.email,
        githubId: user.id,
      });

      return c.json({
        success: true,
        user,
        tokens: authTokens,
      });
    } catch (error: any) {
      return c.json(
        {
          success: false,
          error: error.message,
        },
        400
      );
    }
  });

  // Token refresh
  app.post('/auth/refresh', async (c) => {
    const { refreshToken } = await c.req.json();

    try {
      const tokens = authAPI.refreshAccessToken(refreshToken);
      return c.json({ success: true, tokens });
    } catch (error: any) {
      return c.json(
        {
          success: false,
          error: error.message,
        },
        401
      );
    }
  });

  // =========================================================================
  // Database Routes
  // =========================================================================

  const dbAPI = createDatabaseAPI(env);

  // Execute raw query
  app.post('/db/query', async (c) => {
    if (!isAuthenticated(c)) return c.json({ error: 'Unauthorized' }, 401);

    const { sql, params } = await c.req.json();

    try {
      const result = await dbAPI.execute(sql, params);
      return c.json(result);
    } catch (error: any) {
      return c.json(
        {
          success: false,
          error: error.message,
        },
        500
      );
    }
  });

  // Get users (with pagination)
  app.get('/db/users', async (c) => {
    if (!isAuthenticated(c)) return c.json({ error: 'Unauthorized' }, 401);

    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');

    try {
      const result = await dbAPI.findMany('users', undefined, {
        limit,
        offset: (page - 1) * limit,
      });
      return c.json(result);
    } catch (error: any) {
      return c.json(
        {
          success: false,
          error: error.message,
        },
        500
      );
    }
  });

  // Create user
  app.post('/db/users', async (c) => {
    if (!isAuthenticated(c)) return c.json({ error: 'Unauthorized' }, 401);

    const userData = await c.req.json();

    try {
      const result = await dbAPI.create('users', {
        id: generateId(),
        ...userData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return c.json({ success: true, data: result }, 201);
    } catch (error: any) {
      return c.json(
        {
          success: false,
          error: error.message,
        },
        500
      );
    }
  });

  // =========================================================================
  // Email Routes
  // =========================================================================

  const emailAPI = createEmailAPI({
    provider: config.email?.provider || 'sendgrid',
    apiKey: config.email?.apiKey || '',
    from: config.email?.from || `noreply@${config.domain}`,
  });

  // Send email
  app.post('/email/send', async (c) => {
    if (!isAuthenticated(c)) return c.json({ error: 'Unauthorized' }, 401);

    const emailData = await c.req.json();

    try {
      const result = await emailAPI.send({
        to: emailData.to,
        from: emailData.from || config.email?.from,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      });
      return c.json(result);
    } catch (error: any) {
      return c.json(
        {
          success: false,
          error: error.message,
        },
        500
      );
    }
  });

  // Send welcome email
  app.post('/email/welcome', async (c) => {
    if (!isAuthenticated(c)) return c.json({ error: 'Unauthorized' }, 401);

    const { email, username } = await c.req.json();

    try {
      const result = await emailAPI.sendWelcome(email, username);
      return c.json(result);
    } catch (error: any) {
      return c.json(
        {
          success: false,
          error: error.message,
        },
        500
      );
    }
  });

  // =========================================================================
  // Claude AI Routes
  // =========================================================================

  const claudeAPI = createClaudeAPI({
    apiKey: env.CLAUDE_API_KEY,
    model: config.claude?.model || 'claude-opus-4-6',
  });

  // Generate completion
  app.post('/claude/complete', async (c) => {
    if (!isAuthenticated(c)) return c.json({ error: 'Unauthorized' }, 401);

    const { prompt, maxTokens, model } = await c.req.json();

    try {
      const result = await claudeAPI.generateCompletion(prompt, {
        maxTokens,
        model,
      });
      return c.json({
        success: true,
        content: result,
      });
    } catch (error: any) {
      return c.json(
        {
          success: false,
          error: error.message,
        },
        500
      );
    }
  });

  // Send message (with conversation history)
  app.post('/claude/message', async (c) => {
    if (!isAuthenticated(c)) return c.json({ error: 'Unauthorized' }, 401);

    const { messages, systemPrompt, maxTokens } = await c.req.json();

    try {
      const result = await claudeAPI.sendMessage({
        messages,
        systemPrompt,
        maxTokens,
      });
      return c.json({
        success: true,
        message: result,
      });
    } catch (error: any) {
      return c.json(
        {
          success: false,
          error: error.message,
        },
        500
      );
    }
  });

  // Analyze text
  app.post('/claude/analyze', async (c) => {
    if (!isAuthenticated(c)) return c.json({ error: 'Unauthorized' }, 401);

    const { text, analysisType } = await c.req.json();

    try {
      const result = await claudeAPI.analyzeText(
        text,
        analysisType as 'sentiment' | 'summary' | 'keywords' | 'entities'
      );
      return c.json({
        success: true,
        analysis: result,
      });
    } catch (error: any) {
      return c.json(
        {
          success: false,
          error: error.message,
        },
        500
      );
    }
  });

  // =========================================================================
  // GitHub Routes
  // =========================================================================

  // Get user repositories
  app.get('/github/repos/:username', async (c) => {
    const { username } = c.req.param();

    try {
      const repos = await githubAPI.getUserRepositories(username);
      return c.json({
        success: true,
        repositories: repos,
      });
    } catch (error: any) {
      return c.json(
        {
          success: false,
          error: error.message,
        },
        500
      );
    }
  });

  // Get specific repository
  app.get('/github/repo/:owner/:repo', async (c) => {
    const { owner, repo } = c.req.param();

    try {
      const repository = await githubAPI.getRepository(owner, repo);
      return c.json({
        success: true,
        repository,
      });
    } catch (error: any) {
      return c.json(
        {
          success: false,
          error: error.message,
        },
        500
      );
    }
  });

  // =========================================================================
  // Version & Info
  // =========================================================================

  app.get('/version', (c) => {
    return c.json({
      name: 'whoscrizzz.com API',
      version: '1.0.0',
      environment: config.environment,
      domain: config.domain,
      apis: {
        database: 'D1 (Cloudflare)',
        email: config.email?.provider || 'not configured',
        authentication: 'JWT + GitHub OAuth',
        ai: 'Claude API',
        storage: 'R2 (Cloudflare)',
      },
    });
  });

  return app;
}

// =========================================================================
// Helper Functions
// =========================================================================

/**
 * Check if request is authenticated
 */
function isAuthenticated(c: Context): boolean {
  const authHeader = c.req.header('Authorization');
  return !!authHeader?.startsWith('Bearer ');
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
