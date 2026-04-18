import { AppConfigSchema, AppConfig } from '@/types';

/**
 * Load and validate application configuration from environment variables
 * Supports both Node.js (with dotenv) and Cloudflare Workers environments
 */
export function loadConfig(env?: Record<string, any>): AppConfig {
  // Use provided env or process.env
  const envVars = env || process.env;

  const config: any = {
    domain: envVars.DOMAIN || 'whoscrizzz.com',
    environment: (envVars.ENVIRONMENT || 'development') as 'development' | 'staging' | 'production',

    api: {
      baseUrl: envVars.API_BASE_URL || `https://api.${envVars.DOMAIN || 'whoscrizzz.com'}`,
      version: envVars.API_VERSION || 'v1',
      timeout: parseInt(envVars.API_TIMEOUT || '30000'),
    },

    auth: {},

    email: undefined,
    claude: undefined,
    database: undefined,
  };

  // GitHub OAuth Configuration
  if (envVars.GITHUB_CLIENT_ID && envVars.GITHUB_CLIENT_SECRET) {
    config.auth.github = {
      clientId: envVars.GITHUB_CLIENT_ID,
      clientSecret: envVars.GITHUB_CLIENT_SECRET,
      redirectUri: envVars.GITHUB_REDIRECT_URI ||
        `https://${envVars.DOMAIN || 'whoscrizzz.com'}/api/auth/github/callback`,
    };
  }

  // JWT Configuration
  if (envVars.JWT_SECRET) {
    config.auth.jwt = {
      secret: envVars.JWT_SECRET,
      expiresIn: envVars.JWT_EXPIRES_IN || '7d',
    };
  }

  // Email Configuration
  if (envVars.SENDGRID_API_KEY || envVars.EMAIL_API_KEY) {
    config.email = {
      provider: envVars.EMAIL_PROVIDER || 'sendgrid',
      apiKey: envVars.SENDGRID_API_KEY || envVars.EMAIL_API_KEY,
      from: envVars.EMAIL_FROM || `noreply@${envVars.DOMAIN || 'whoscrizzz.com'}`,
    };
  }

  // Claude API Configuration
  if (envVars.CLAUDE_API_KEY) {
    config.claude = {
      apiKey: envVars.CLAUDE_API_KEY,
      model: envVars.CLAUDE_MODEL || 'claude-opus-4-6',
    };
  }

  // Database Configuration
  if (envVars.DATABASE_TYPE || envVars.DATABASE_URL) {
    config.database = {
      type: envVars.DATABASE_TYPE || 'd1',
      url: envVars.DATABASE_URL,
    };
  }

  // Validate configuration
  const validatedConfig = AppConfigSchema.parse(config);
  return validatedConfig;
}

/**
 * Get a configuration value with fallback
 */
export function getConfigValue(key: string, defaultValue?: any): any {
  const config = loadConfig();
  const keys = key.split('.');
  let value: any = config;

  for (const k of keys) {
    value = value?.[k];
  }

  return value ?? defaultValue;
}

/**
 * Environment variable names for Cloudflare Workers bindings
 */
export const ENV_KEYS = {
  // Domain & URLs
  DOMAIN: 'DOMAIN',
  CUSTOM_DOMAIN: 'CUSTOM_DOMAIN',
  API_BASE_URL: 'API_BASE_URL',

  // Authentication
  GITHUB_CLIENT_ID: 'GITHUB_CLIENT_ID',
  GITHUB_CLIENT_SECRET: 'GITHUB_CLIENT_SECRET',
  GITHUB_REDIRECT_URI: 'GITHUB_REDIRECT_URI',
  JWT_SECRET: 'JWT_SECRET',
  JWT_EXPIRES_IN: 'JWT_EXPIRES_IN',

  // Email
  SENDGRID_API_KEY: 'SENDGRID_API_KEY',
  EMAIL_API_KEY: 'EMAIL_API_KEY',
  EMAIL_FROM: 'EMAIL_FROM',
  EMAIL_PROVIDER: 'EMAIL_PROVIDER',

  // Claude
  CLAUDE_API_KEY: 'CLAUDE_API_KEY',
  CLAUDE_MODEL: 'CLAUDE_MODEL',

  // Database
  DATABASE_TYPE: 'DATABASE_TYPE',
  DATABASE_URL: 'DATABASE_URL',

  // Cloudflare
  CLOUDFLARE_API_TOKEN: 'CLOUDFLARE_API_TOKEN',
  CLOUDFLARE_ZONE_ID: 'CLOUDFLARE_ZONE_ID',
  CLOUDFLARE_ACCOUNT_ID: 'CLOUDFLARE_ACCOUNT_ID',

  // API
  API_VERSION: 'API_VERSION',
  API_TIMEOUT: 'API_TIMEOUT',

  // Environment
  ENVIRONMENT: 'ENVIRONMENT',
} as const;

export type EnvKey = typeof ENV_KEYS[keyof typeof ENV_KEYS];
