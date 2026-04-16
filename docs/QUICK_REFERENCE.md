# whoscrizzz.com - Quick Reference Card

Fast lookup for configuration, APIs, and common tasks.

---

## 🚀 Setup (5 minutes)

```bash
# 1. Install
npm install

# 2. Copy env
cp .env.example .env.local

# 3. Set secrets
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put JWT_SECRET
wrangler secret put SENDGRID_API_KEY
wrangler secret put CLAUDE_API_KEY
wrangler secret put CLOUDFLARE_API_TOKEN

# 4. Run
npm run dev

# 5. Test
curl http://localhost:8787/health
```

---

## 🔑 Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `DOMAIN` | Your domain | Yes |
| `JWT_SECRET` | Token signing key | Yes |
| `GITHUB_CLIENT_ID` | GitHub OAuth | If using GitHub |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth | If using GitHub |
| `SENDGRID_API_KEY` | Email service | If using SendGrid |
| `CLAUDE_API_KEY` | AI service | If using Claude |
| `CLOUDFLARE_API_TOKEN` | Cloudflare admin | For DNS/zone management |

---

## 📦 Import APIs

```typescript
import {
  createDatabaseAPI,      // D1 database
  createEmailAPI,         // Email service
  createGitHubAPI,        // GitHub integration
  createClaudeAPI,        // Claude AI
  createAuthAPI,          // JWT authentication
} from '@/api';
```

---

## 💾 Database Quick Ref

```typescript
const db = createDatabaseAPI(env);

// Create
await db.create('users', { id: '1', username: 'john' });

// Read
const user = await db.findOne('users', { id: '1' });

// List with pagination
const { data, pagination } = await db.findMany('users', {}, {
  limit: 20,
  offset: 0,
});

// Update
await db.update('users', { username: 'jane' }, { id: '1' });

// Delete
await db.delete('users', { id: '1' });

// Raw SQL
await db.execute('SELECT * FROM users WHERE age > ?', [18]);

// Transaction
await db.transaction(async (db) => {
  await db.create('users', {...});
  await db.create('profiles', {...});
});
```

---

## 📧 Email Quick Ref

```typescript
const email = createEmailAPI({
  provider: 'sendgrid',
  apiKey: env.SENDGRID_API_KEY,
  from: 'noreply@whoscrizzz.com',
});

// Send
await email.send({
  to: 'user@example.com',
  subject: 'Hello',
  html: '<h1>Hello</h1>',
});

// Template
await email.sendWelcome('user@example.com', 'john');
await email.sendPasswordReset('user@example.com', 'token', 'url');
await email.sendVerification('user@example.com', 'token', 'url');
```

---

## 🐙 GitHub Quick Ref

```typescript
const github = createGitHubAPI({
  clientId: env.GITHUB_CLIENT_ID,
  clientSecret: env.GITHUB_CLIENT_SECRET,
  redirectUri: 'https://api.whoscrizzz.com/api/auth/github/callback',
});

// OAuth
const url = github.getAuthorizationUrl();
const token = await github.getAccessToken(code);

// User
const user = await github.getUser();
const repos = await github.getUserRepositories('torvalds');
const repo = await github.getRepository('facebook', 'react');

// Actions
await github.starRepository('facebook', 'react');
await github.createIssue('owner', 'repo', {
  title: 'Bug',
  body: 'Description',
});
```

---

## 🤖 Claude Quick Ref

```typescript
const claude = createClaudeAPI({
  apiKey: env.CLAUDE_API_KEY,
  model: 'claude-opus-4-6',
});

// Generate
const text = await claude.generateCompletion('Explain AI');

// Message
const msg = await claude.sendMessage({
  messages: [
    { role: 'user', content: 'Hi' },
  ],
});

// Analyze
await claude.analyzeText('text', 'sentiment');   // positive/negative/neutral
await claude.analyzeText('text', 'summary');     // brief summary
await claude.analyzeText('text', 'keywords');    // [key1, key2, ...]
await claude.analyzeText('text', 'entities');    // {people: [...], orgs: [...]}

// Code
await claude.generateCode('Create a function...');
await claude.reviewCode('code here', { language: 'TypeScript' });
```

---

## 🔐 Auth Quick Ref

```typescript
const auth = createAuthAPI({
  secret: env.JWT_SECRET,
  expiresIn: '7d',
});

// Create tokens
const tokens = auth.generateTokens({
  id: 'user-123',
  username: 'john',
  email: 'john@example.com',
});

// Verify
const user = auth.verifyToken(tokens.accessToken);

// Refresh
const newTokens = auth.refreshAccessToken(tokens.refreshToken);

// Special tokens
const resetToken = auth.generatePasswordResetToken('user-123');
const verifyToken = auth.generateEmailVerificationToken('john@example.com');
const apiKey = auth.createAPIKey('user-123', 'API Key Name');
```

---

## 🌐 API Endpoints

### Authentication
```
GET    /api/auth/github              → Get OAuth URL
POST   /api/auth/github/callback     → OAuth callback
POST   /api/auth/refresh             → Refresh token
```

### Database
```
POST   /api/db/query                 → Execute SQL
GET    /api/db/users                 → List users (paginated)
POST   /api/db/users                 → Create user
```

### Email
```
POST   /api/email/send               → Send email
POST   /api/email/welcome            → Send welcome
```

### Claude
```
POST   /api/claude/complete          → Generate text
POST   /api/claude/message           → Chat
POST   /api/claude/analyze           → Analyze text
```

### GitHub
```
GET    /api/github/repos/:username   → Get repos
GET    /api/github/repo/:owner/:repo → Get repo
```

### System
```
GET    /health                       → Health check
GET    /api/version                  → API version
```

---

## 📊 Database Schema

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  github_id INTEGER,
  avatar_url TEXT,
  created_at DATETIME,
  updated_at DATETIME
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE email_logs (
  id TEXT PRIMARY KEY,
  to_email TEXT,
  subject TEXT,
  status TEXT,
  sent_at DATETIME
);
```

---

## ⚙️ Wrangler Commands

```bash
# Development
wrangler dev                          # Start dev server

# Secrets
wrangler secret put NAME              # Set secret
wrangler secret list                  # List secrets

# Database
wrangler d1 create db-name            # Create database
wrangler d1 list                      # List databases
wrangler d1 backup db-name            # Backup database

# Deployment
wrangler deploy                       # Deploy production
wrangler deploy --env staging         # Deploy staging
wrangler tail                         # View logs
```

---

## 🧪 Quick Tests

```bash
# Health
curl http://localhost:8787/health

# GitHub Auth
curl http://localhost:8787/api/auth/github

# Claude
curl -X POST http://localhost:8787/api/claude/complete \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hi"}'

# Database
curl -X POST http://localhost:8787/api/db/query \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM users"}'

# Email
curl -X POST http://localhost:8787/api/email/send \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to": "user@example.com", "subject": "Hi", "html": "<h1>Hi</h1>"}'
```

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Auth failing | Check JWT_SECRET is set |
| Email not sending | Verify SendGrid key |
| Database error | Check D1 binding configured |
| GitHub error | Verify OAuth credentials |
| Claude 401 | Check API key is valid |

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies |
| `wrangler.jsonc` | Cloudflare config |
| `.env.example` | Environment template |
| `tsconfig.json` | TypeScript config |
| `src/api/` | API implementations |
| `src/types/` | Type definitions |
| `src/routes/api.ts` | Example routes |

---

## 📚 Documentation

- **SETUP_GUIDE.md** → Setup instructions
- **API_IMPLEMENTATION.md** → Full API docs
- **INTEGRATION_SUMMARY.md** → What was built
- **QUICK_REFERENCE.md** → This file

---

## 🎨 Design Standards (whoscrizzz.com)

✨ **Minimalist + Modern**
- Colors: Gray (#666, #999) + Blue (#0066cc, #0052a3)
- Typography: Clean sans-serif
- Spacing: Generous padding
- Interactions: Smooth transitions

---

## 💡 Tips

1. Always use `wrangler secret put` for sensitive data
2. Use pagination for large datasets
3. Batch email sends to reduce API calls
4. Cache frequently used queries in KV
5. Monitor API usage and rate limits
6. Use transactions for critical operations
7. Validate all user inputs with Zod
8. Keep tokens secure - never log them

---

**Keep this handy!** 📌

Last updated: April 2026
