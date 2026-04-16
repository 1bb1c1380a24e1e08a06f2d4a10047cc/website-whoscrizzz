import { z } from 'zod';

// ============================================================================
// User & Authentication Types
// ============================================================================

export const UserSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(3).max(50),
  email: z.string().email(),
  githubId: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  role: z.enum(['user', 'admin', 'moderator']).default('user'),
});

export type User = z.infer<typeof UserSchema>;

export const AuthTokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.number(),
  tokenType: z.string().default('Bearer'),
});

export type AuthToken = z.infer<typeof AuthTokenSchema>;

// ============================================================================
// Database Types
// ============================================================================

export const DatabaseConfig = z.object({
  type: z.enum(['d1', 'postgres', 'mysql']),
  connectionString: z.string().optional(),
  database: z.string(),
  tables: z.record(z.string(), z.any()),
});

export type DatabaseConfig = z.infer<typeof DatabaseConfig>;

export const QueryResult = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  duration: z.number(),
});

export type QueryResult = z.infer<typeof QueryResult>;

// ============================================================================
// Email Types
// ============================================================================

export const EmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  from: z.string().email(),
  subject: z.string(),
  html: z.string(),
  text: z.string().optional(),
  replyTo: z.string().email().optional(),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(),
    contentType: z.string(),
  })).optional(),
});

export type Email = z.infer<typeof EmailSchema>;

export const EmailResponseSchema = z.object({
  id: z.string(),
  status: z.enum(['sent', 'pending', 'failed']),
  message: z.string().optional(),
  timestamp: z.date(),
});

export type EmailResponse = z.infer<typeof EmailResponseSchema>;

// ============================================================================
// GitHub Integration Types
// ============================================================================

export const GitHubUserSchema = z.object({
  id: z.number(),
  login: z.string(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  avatar_url: z.string().url(),
  bio: z.string().nullable(),
  public_repos: z.number(),
  followers: z.number(),
});

export type GitHubUser = z.infer<typeof GitHubUserSchema>;

export const RepositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  fullName: z.string(),
  description: z.string().nullable(),
  url: z.string().url(),
  stars: z.number(),
  language: z.string().nullable(),
  isPrivate: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Repository = z.infer<typeof RepositorySchema>;

// ============================================================================
// Claude API Integration Types
// ============================================================================

export const ClaudeMessageSchema = z.object({
  id: z.string(),
  type: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  model: z.string(),
  createdAt: z.date(),
  tokensUsed: z.object({
    input: z.number(),
    output: z.number(),
  }),
});

export type ClaudeMessage = z.infer<typeof ClaudeMessageSchema>;

export const ClaudeRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
  model: z.string().default('claude-opus-4-6'),
  maxTokens: z.number().default(2048),
  systemPrompt: z.string().optional(),
});

export type ClaudeRequest = z.infer<typeof ClaudeRequestSchema>;

// ============================================================================
// Cloudflare Integration Types
// ============================================================================

export const CloudflareZoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  accountId: z.string(),
  nameservers: z.array(z.string()),
  status: z.enum(['active', 'pending', 'setup_nameserver']),
});

export type CloudflareZone = z.infer<typeof CloudflareZoneSchema>;

export const DNSRecordSchema = z.object({
  id: z.string(),
  type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS']),
  name: z.string(),
  content: z.string(),
  ttl: z.number().default(3600),
  proxied: z.boolean().optional(),
});

export type DNSRecord = z.infer<typeof DNSRecordSchema>;

// ============================================================================
// Application Configuration Types
// ============================================================================

export const AppConfigSchema = z.object({
  domain: z.string().url(),
  environment: z.enum(['development', 'staging', 'production']),
  api: z.object({
    baseUrl: z.string().url(),
    version: z.string().default('v1'),
    timeout: z.number().default(30000),
  }),
  auth: z.object({
    github: z.object({
      clientId: z.string(),
      clientSecret: z.string(),
      redirectUri: z.string().url(),
    }).optional(),
    jwt: z.object({
      secret: z.string(),
      expiresIn: z.string().default('7d'),
    }).optional(),
  }),
  email: z.object({
    provider: z.enum(['sendgrid', 'nodemailer', 'cloudflare']),
    apiKey: z.string(),
    from: z.string().email(),
  }).optional(),
  claude: z.object({
    apiKey: z.string(),
    model: z.string().default('claude-opus-4-6'),
  }).optional(),
  database: z.object({
    type: z.enum(['d1', 'postgres', 'mysql']),
    url: z.string().optional(),
  }).optional(),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

// ============================================================================
// API Response Types
// ============================================================================

export const APIResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }).optional(),
  timestamp: z.date(),
  requestId: z.string(),
});

export type APIResponse<T = any> = z.infer<typeof APIResponseSchema> & {
  data?: T;
};

// ============================================================================
// Pagination Types
// ============================================================================

export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(20),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

export type Pagination = z.infer<typeof PaginationSchema>;
