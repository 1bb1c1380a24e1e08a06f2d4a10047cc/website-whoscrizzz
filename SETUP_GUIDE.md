# whoscrizzz.com - Setup Guide

Complete guide to setting up and configuring all APIs and integrations for whoscrizzz.com.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [GitHub OAuth Setup](#github-oauth-setup)
5. [Email Configuration](#email-configuration)
6. [Claude API Setup](#claude-api-setup)
7. [Database Setup](#database-setup)
8. [Cloudflare Configuration](#cloudflare-configuration)
9. [Deployment](#deployment)
10. [Testing](#testing)

---

## Prerequisites

- Node.js >= 18
- npm or yarn
- Cloudflare account with Workers enabled
- Git
- Access to whoscrizzz.com domain (DNS control)

---

## Installation

```bash
# Clone the repository
git clone https://github.com/whoscrizzz/website-whoscrizzz.git
cd website-whoscrizzz

# Install dependencies
npm install

# Or with yarn
yarn install
```

---

## Configuration

### 1. Environment Variables

Create environment-specific `.env` files:

```bash
# Copy example environment file
cp .env.example .env.local
cp .env.example .env.production

# Edit local development config
nano .env.local

# Edit production config (be careful with secrets!)
nano .env.production
```

### 2. TypeScript Compilation

```bash
# Check TypeScript compilation
npm run type-check

# Run linter
npm run lint
```

---

## GitHub OAuth Setup

### Step 1: Create GitHub OAuth App

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the form:
   - **Application name**: whoscrizzz
   - **Homepage URL**: https://whoscrizzz.com
   - **Authorization callback URL**: https://api.whoscrizzz.com/api/auth/github/callback

### Step 2: Set Environment Variables

```bash
# Get from GitHub OAuth App settings
wrangler secret put GITHUB_CLIENT_ID
# Paste: <your_client_id>

wrangler secret put GITHUB_CLIENT_SECRET
# Paste: <your_client_secret>

wrangler secret put GITHUB_REDIRECT_URI
# Paste: https://api.whoscrizzz.com/api/auth/github/callback
```

### Step 3: Test Authentication

```bash
npm run dev

# Visit: http://localhost:8787/api/auth/github
```

---

## Email Configuration

### Option A: SendGrid

1. Create SendGrid account: https://sendgrid.com/
2. Generate API key from Settings → API Keys
3. Set environment variable:

```bash
wrangler secret put SENDGRID_API_KEY
# Paste: <your_sendgrid_api_key>

wrangler secret put EMAIL_FROM
# Paste: noreply@whoscrizzz.com
```

### Option B: Nodemailer (Gmail)

1. Enable 2FA on Gmail account
2. Generate app password: https://myaccount.google.com/apppasswords
3. Set environment variables:

```bash
wrangler secret put EMAIL_PROVIDER
# Paste: nodemailer

wrangler secret put NODEMAILER_HOST
# Paste: smtp.gmail.com

wrangler secret put NODEMAILER_PORT
# Paste: 587

wrangler secret put NODEMAILER_USER
# Paste: your_email@gmail.com

wrangler secret put NODEMAILER_PASS
# Paste: <your_app_password>
```

### Option C: Cloudflare Email Routing

1. Set domain nameservers to Cloudflare
2. Enable Email Routing in Cloudflare dashboard
3. Create routing rules
4. Configure MCP server for async processing

---

## Claude API Setup

### Step 1: Get API Key

1. Go to https://console.anthropic.com/
2. Create new API key
3. Set environment variable:

```bash
wrangler secret put CLAUDE_API_KEY
# Paste: <your_claude_api_key>

wrangler secret put CLAUDE_MODEL
# Paste: claude-opus-4-6
```

### Step 2: Test Integration

```bash
npm run dev

# Test Claude endpoint:
curl -X POST http://localhost:8787/api/claude/complete \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, how are you?"}'
```

---

## Database Setup

### D1 Database

```bash
# Create D1 database
wrangler d1 create whoscrizzz_db

# Run migrations
npm run dev

# Then in another terminal:
curl -X POST http://localhost:8787/api/db/migrate

# Backup database
wrangler d1 backup whoscrizzz_db
```

### Create Tables

The database schema includes:

- `_migrations` - Migration tracking
- `users` - User accounts
- `repositories` - GitHub repositories
- `emails_sent` - Email log
- `api_keys` - API keys for service auth

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  github_id INTEGER UNIQUE,
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_github_id ON users(github_id);
```

---

## Cloudflare Configuration

### Step 1: API Token

1. Go to Cloudflare Dashboard → API Tokens
2. Create token with these scopes:
   - Zone → DNS → Edit
   - Zone → Cache Purge → Purge
   - Account → D1 → Edit
   - Account → Workers → Write

```bash
wrangler secret put CLOUDFLARE_API_TOKEN
# Paste: <your_api_token>
```

### Step 2: Zone Configuration

```bash
# Get Zone ID
wrangler secret put CLOUDFLARE_ZONE_ID
# Paste: <your_zone_id>

# Get Account ID
wrangler secret put CLOUDFLARE_ACCOUNT_ID
# Paste: <your_account_id>
```

### Step 3: DNS Setup

Update DNS records for whoscrizzz.com:

```
A      whoscrizzz.com              → 192.0.2.1 (your server)
CNAME  api.whoscrizzz.com          → api-whoscrizzz.workers.dev
CNAME  app.whoscrizzz.com          → app-whoscrizzz.pages.dev
MX     whoscrizzz.com              → mail.whoscrizzz.com (if using Email Routing)
TXT    whoscrizzz.com              → v=spf1 include:sendgrid.net ~all
```

---

## Deployment

### Development

```bash
npm run dev

# Server runs at: http://localhost:8787
```

### Staging

```bash
# Deploy to staging environment
npm run deploy -- --env staging

# Test: https://staging-api.whoscrizzz.com
```

### Production

```bash
# Build
npm run build

# Deploy to production
npm run deploy

# Test: https://api.whoscrizzz.com
```

---

## Testing

### API Endpoints

```bash
# Health check
curl https://api.whoscrizzz.com/health

# GitHub authentication
curl https://api.whoscrizzz.com/api/auth/github/authorize

# Send email test
curl -X POST https://api.whoscrizzz.com/api/email/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<h1>Hello World</h1>"
  }'

# Claude API test
curl -X POST https://api.whoscrizzz.com/api/claude/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "prompt": "Explain whoscrizzz.com"
  }'

# Database query
curl -X POST https://api.whoscrizzz.com/api/db/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "sql": "SELECT * FROM users LIMIT 10"
  }'
```

### Run Tests

```bash
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test -- --coverage
```

---

## Troubleshooting

### Authentication Issues

- Verify JWT_SECRET is set
- Check token expiration
- Ensure GitHub OAuth credentials are correct

### Email Not Sending

- Check email provider credentials
- Verify email address format
- Check spam folder
- Review Email API logs

### Database Issues

- Verify D1 binding is configured
- Check database exists: `wrangler d1 list`
- Review migration logs
- Ensure SQL syntax is correct

### Claude API Issues

- Verify API key is valid
- Check token usage limits
- Review API response errors
- Ensure model name is correct

---

## Security Best Practices

1. **Secrets Management**
   - Never commit `.env` files
   - Use `wrangler secret` for sensitive data
   - Rotate API keys regularly

2. **Database**
   - Use parameterized queries (prevents SQL injection)
   - Implement row-level security
   - Regular backups
   - Encrypt sensitive data at rest

3. **Authentication**
   - Use HTTPS only
   - Implement rate limiting
   - Enable CORS only for trusted origins
   - Use strong JWT secrets

4. **API Security**
   - Implement API key validation
   - Use request signing
   - Enable request logging
   - Monitor for unusual patterns

---

## Next Steps

1. Configure all integrations in order (GitHub → Email → Claude)
2. Test each API endpoint
3. Deploy to staging environment
4. Run full test suite
5. Deploy to production
6. Monitor logs and metrics
7. Set up automated backups

---

## Support

For issues or questions:

1. Check logs: `wrangler tail`
2. Review error messages
3. Check GitHub Issues
4. Contact: support@whoscrizzz.com

---

## Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Hono Framework](https://hono.dev/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [GitHub OAuth Docs](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Anthropic Claude API](https://docs.anthropic.com/)

---

Last updated: April 2026
