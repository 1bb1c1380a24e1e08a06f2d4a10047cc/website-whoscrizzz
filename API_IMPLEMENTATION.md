# whoscrizzz.com API Implementation Guide

Complete documentation for implementing and using all APIs integrated with whoscrizzz.com.

---

## Quick Start

```typescript
import {
  createDatabaseAPI,
  createEmailAPI,
  createGitHubAPI,
  createClaudeAPI,
  createAuthAPI,
} from '@/api';

import { loadConfig } from '@/utils/config';

// Load configuration
const config = loadConfig(process.env);

// Initialize APIs
const dbAPI = createDatabaseAPI(env);
const emailAPI = createEmailAPI(config.email);
const githubAPI = createGitHubAPI(config.auth.github);
const claudeAPI = createClaudeAPI(config.claude);
const authAPI = createAuthAPI(config.auth.jwt);
```

---

## API Documentation

### 1. Database API

**Purpose**: SQLite (D1) database operations with TypeScript support.

#### Methods

```typescript
// Execute raw SQL
await dbAPI.execute<User>('SELECT * FROM users', []);

// Find one record
const user = await dbAPI.findOne<User>('users', { email: 'user@example.com' });

// Find multiple with pagination
const { data, pagination } = await dbAPI.findMany<User>('users', undefined, {
  limit: 20,
  offset: 0,
  orderBy: 'created_at',
  orderDirection: 'DESC',
});

// Create record
await dbAPI.create('users', {
  id: '123',
  username: 'john_doe',
  email: 'john@example.com',
});

// Update record
await dbAPI.update(
  'users',
  { username: 'jane_doe' },
  { id: '123' }
);

// Delete record
await dbAPI.delete('users', { id: '123' });

// Run transaction
await dbAPI.transaction(async (db) => {
  await db.create('users', { ... });
  await db.create('user_profiles', { ... });
});
```

#### Database Schema

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  github_id INTEGER UNIQUE,
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  role TEXT DEFAULT 'user'
);

-- User sessions
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Email logs
CREATE TABLE email_logs (
  id TEXT PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'sent',
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### 2. Email API

**Purpose**: Send emails via SendGrid, Nodemailer, or Cloudflare.

#### Methods

```typescript
// Send email
await emailAPI.send({
  to: 'user@example.com',
  from: 'noreply@whoscrizzz.com',
  subject: 'Welcome to whoscrizzz.com',
  html: '<h1>Welcome!</h1>',
  text: 'Welcome to whoscrizzz.com',
});

// Send batch emails
await emailAPI.sendBatch([
  {
    to: 'user1@example.com',
    from: 'noreply@whoscrizzz.com',
    subject: 'Hello User 1',
    html: '<h1>Hello</h1>',
  },
  {
    to: 'user2@example.com',
    from: 'noreply@whoscrizzz.com',
    subject: 'Hello User 2',
    html: '<h1>Hello</h1>',
  },
]);

// Send templated email
await emailAPI.sendTemplate('user@example.com', 'welcome', {
  username: 'john_doe',
  subject: 'Welcome!',
});

// Built-in templates
await emailAPI.sendWelcome('user@example.com', 'john_doe');
await emailAPI.sendPasswordReset('user@example.com', 'token123', 'https://...');
await emailAPI.sendVerification('user@example.com', 'token456', 'https://...');
```

---

### 3. GitHub API

**Purpose**: Authenticate users and access GitHub data.

#### OAuth Flow

```typescript
// 1. Get authorization URL
const authUrl = githubAPI.getAuthorizationUrl(['user', 'repo']);
// → Redirect user to GitHub

// 2. Handle callback and get token
const accessToken = await githubAPI.getAccessToken(code);

// 3. Get user info
const user = await githubAPI.getUser();
```

#### User Methods

```typescript
// Get authenticated user
const user = await githubAPI.getUser();

// Get user by username
const otherUser = await githubAPI.getUserByUsername('torvalds');

// Get user repositories
const repos = await githubAPI.getUserRepositories('torvalds', {
  per_page: 30,
  page: 1,
});

// Get specific repository
const repo = await githubAPI.getRepository('torvalds', 'linux');

// Star repository
await githubAPI.starRepository('facebook', 'react');

// Create issue
await githubAPI.createIssue('owner', 'repo', {
  title: 'Bug report',
  body: 'Description of bug',
  labels: ['bug', 'urgent'],
});
```

---

### 4. Claude API

**Purpose**: AI-powered text generation and analysis.

#### Basic Usage

```typescript
// Generate completion
const response = await claudeAPI.generateCompletion(
  'Explain quantum computing',
  {
    maxTokens: 2048,
  }
);

// Send message with context
const message = await claudeAPI.sendMessage({
  messages: [
    { role: 'user', content: 'Hello!' },
    { role: 'assistant', content: 'Hi there! How can I help?' },
    { role: 'user', content: 'Tell me a joke' },
  ],
  maxTokens: 1024,
});
```

#### Analysis Methods

```typescript
// Sentiment analysis
await claudeAPI.analyzeText(
  'This product is amazing!',
  'sentiment'
); // → "positive"

// Summarization
await claudeAPI.analyzeText(
  'Long article text...',
  'summary'
);

// Extract keywords
await claudeAPI.analyzeText(
  'Article about AI and machine learning...',
  'keywords'
); // → ['AI', 'machine learning', ...]

// Extract entities
await claudeAPI.analyzeText(
  'Steve Jobs founded Apple in Cupertino...',
  'entities'
); // → { person: ['Steve Jobs'], org: ['Apple'], location: ['Cupertino'] }
```

#### Advanced Features

```typescript
// Code generation
const code = await claudeAPI.generateCode(
  'Create a TypeScript function that validates emails',
  { language: 'TypeScript' }
);

// Code review
const review = await claudeAPI.reviewCode(
  'function add(a, b) { return a + b; }',
  { language: 'JavaScript', focusAreas: ['performance', 'readability'] }
);

// Text translation
const translated = await claudeAPI.translateText(
  'Hello world',
  'Spanish'
); // → "Hola mundo"

// Extract structured data
const data = await claudeAPI.extractStructuredData(
  'Email: john@example.com, Phone: 555-1234',
  { email: 'string', phone: 'string' }
);

// Brainstorm ideas
const ideas = await claudeAPI.brainstormIdeas('AI applications', 5);

// Generate documentation
const docs = await claudeAPI.generateDocumentation(
  'function multiply(a, b) { return a * b; }',
  { style: 'jsdoc' }
);
```

---

### 5. Authentication API

**Purpose**: JWT token management and user authentication.

#### Methods

```typescript
// Generate tokens
const tokens = authAPI.generateTokens({
  id: 'user-123',
  username: 'john_doe',
  email: 'john@example.com',
});

// Verify token
const user = authAPI.verifyToken(tokens.accessToken);

// Refresh token
const newTokens = authAPI.refreshAccessToken(tokens.refreshToken);

// Check expiration
const expired = authAPI.isTokenExpired(token);

// Special tokens
const resetToken = authAPI.generatePasswordResetToken('user-123');
const verifyToken = authAPI.generateEmailVerificationToken('john@example.com');
const apiKey = authAPI.createAPIKey('user-123', 'My API Key');

// Verify special tokens
const userId = authAPI.verifyPasswordResetToken(resetToken);
const email = authAPI.verifyEmailVerificationToken(verifyToken);
const apiKeyData = authAPI.verifyAPIKey(apiKey);
```

---

## Integration Examples

### Example 1: User Registration with GitHub

```typescript
app.post('/api/auth/register', async (c) => {
  const { code } = await c.req.json();

  // Get GitHub access token
  const accessToken = await githubAPI.getAccessToken(code);

  // Get GitHub user info
  const githubUser = await githubAPI.getUser();

  // Create user in database
  const user = await dbAPI.create('users', {
    id: generateId(),
    username: githubUser.login,
    email: githubUser.email,
    github_id: githubUser.id,
    avatar_url: githubUser.avatar_url,
  });

  // Send welcome email
  await emailAPI.sendWelcome(user.email, user.username);

  // Generate tokens
  const tokens = authAPI.generateTokens(user);

  return c.json({ success: true, user, tokens });
});
```

### Example 2: AI Content Generation

```typescript
app.post('/api/claude/generate-post', async (c) => {
  const { title, topic } = await c.req.json();

  // Generate content with Claude
  const content = await claudeAPI.generateCompletion(
    `Write a blog post about ${topic} titled "${title}"`
  );

  // Save to database
  const post = await dbAPI.create('posts', {
    id: generateId(),
    title,
    content,
    user_id: c.get('userId'),
  });

  // Send notification email
  await emailAPI.sendTemplate(c.get('userEmail'), 'post-published', {
    title,
    url: `https://whoscrizzz.com/posts/${post.id}`,
  });

  return c.json({ success: true, post });
});
```

### Example 3: Batch Processing

```typescript
app.post('/api/batch/analyze', async (c) => {
  const { texts } = await c.req.json();

  // Analyze multiple texts in parallel
  const results = await claudeAPI.batchProcess(
    texts.map((text: string) => ({
      prompt: `Analyze sentiment of: "${text}"`,
    }))
  );

  // Save results
  for (let i = 0; i < texts.length; i++) {
    await dbAPI.create('analyses', {
      id: generateId(),
      text: texts[i],
      result: results[i],
    });
  }

  return c.json({ success: true, count: texts.length });
});
```

---

## Error Handling

```typescript
try {
  const user = await githubAPI.getUser();
} catch (error) {
  if (error instanceof Error) {
    console.error('GitHub API Error:', error.message);
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
}
```

---

## Performance Tips

1. **Database**: Use pagination for large result sets
2. **Email**: Batch send multiple emails to reduce API calls
3. **Claude**: Cache frequently used prompts
4. **GitHub**: Implement rate limit handling
5. **Caching**: Use KV namespace for frequently accessed data

---

## Security Best Practices

1. Always verify JWT tokens before processing
2. Validate and sanitize user input
3. Use HTTPS only
4. Implement rate limiting on API endpoints
5. Never log sensitive data (tokens, passwords)
6. Rotate API keys regularly
7. Use environment variables for secrets

---

## Testing

```typescript
// Test database
const user = await dbAPI.create('users', {
  id: 'test-user',
  username: 'test',
  email: 'test@example.com',
});

// Test email
const emailResult = await emailAPI.send({
  to: 'test@example.com',
  from: 'noreply@whoscrizzz.com',
  subject: 'Test',
  html: '<h1>Test</h1>',
});

// Test Claude
const response = await claudeAPI.generateCompletion('Test prompt');

// Test authentication
const tokens = authAPI.generateTokens({ id: 'test-user' });
const verified = authAPI.verifyToken(tokens.accessToken);
```

---

## Monitoring & Logging

```typescript
// Log API calls
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;

  console.log({
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration: `${duration}ms`,
    requestId: c.get('requestId'),
  });
});
```

---

## Resources

- [API Reference](/src/api/index.ts)
- [Type Definitions](/src/types/index.ts)
- [Setup Guide](./SETUP_GUIDE.md)
- [Configuration Guide](/src/utils/config.ts)

---

Last updated: April 2026
