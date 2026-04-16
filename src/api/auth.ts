import jwt from 'jsonwebtoken';
import { User, AuthToken } from '@/types';

/**
 * Authentication API
 * Handles JWT token generation, validation, and user authentication
 */
export class AuthAPI {
  private secret: string;
  private expiresIn: string;

  constructor(config: { secret: string; expiresIn?: string }) {
    this.secret = config.secret;
    this.expiresIn = config.expiresIn || '7d';
  }

  /**
   * Generate JWT tokens
   */
  generateTokens(user: Partial<User>): AuthToken {
    const accessToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'user',
      },
      this.secret,
      { expiresIn: this.expiresIn }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      this.secret,
      { expiresIn: '30d' }
    );

    const decodedAccess = jwt.decode(accessToken) as any;

    return {
      accessToken,
      refreshToken,
      expiresAt: decodedAccess.exp * 1000,
      tokenType: 'Bearer',
    };
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.secret);
    } catch (error: any) {
      throw new Error(`Invalid token: ${error.message}`);
    }
  }

  /**
   * Decode token without verification
   */
  decodeToken(token: string): any {
    return jwt.decode(token);
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      return decoded.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  /**
   * Refresh access token
   */
  refreshAccessToken(refreshToken: string): AuthToken {
    try {
      const decoded = jwt.verify(refreshToken, this.secret) as any;

      // Generate new tokens
      const accessToken = jwt.sign(
        {
          id: decoded.id,
        },
        this.secret,
        { expiresIn: this.expiresIn }
      );

      const decodedAccess = jwt.decode(accessToken) as any;

      return {
        accessToken,
        refreshToken,
        expiresAt: decodedAccess.exp * 1000,
        tokenType: 'Bearer',
      };
    } catch (error: any) {
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  /**
   * Hash password (using simple example - use bcrypt in production)
   */
  hashPassword(password: string): string {
    // In production, use bcrypt instead
    const encoder = new TextEncoder();
    const data = encoder.encode(password + this.secret);
    // Simple hash for demonstration - replace with bcrypt in production
    return Buffer.from(data).toString('base64');
  }

  /**
   * Verify password
   */
  verifyPassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }

  /**
   * Create session
   */
  createSession(user: Partial<User>, expiresIn?: number): AuthToken {
    const tokens = this.generateTokens(user);

    return {
      ...tokens,
      expiresAt: expiresIn || Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
  }

  /**
   * Validate session
   */
  validateSession(token: string): boolean {
    return !this.isTokenExpired(token);
  }

  /**
   * Revoke token (in practice, maintain a blacklist)
   */
  revokeToken(token: string): boolean {
    // In production, add token to a blacklist/cache
    return true;
  }

  /**
   * Generate password reset token
   */
  generatePasswordResetToken(userId: string): string {
    return jwt.sign({ id: userId, type: 'reset' }, this.secret, {
      expiresIn: '1h',
    });
  }

  /**
   * Verify password reset token
   */
  verifyPasswordResetToken(token: string): string | null {
    try {
      const decoded = jwt.verify(token, this.secret) as any;
      if (decoded.type === 'reset') {
        return decoded.id;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Generate email verification token
   */
  generateEmailVerificationToken(email: string): string {
    return jwt.sign({ email, type: 'verify' }, this.secret, {
      expiresIn: '24h',
    });
  }

  /**
   * Verify email verification token
   */
  verifyEmailVerificationToken(token: string): string | null {
    try {
      const decoded = jwt.verify(token, this.secret) as any;
      if (decoded.type === 'verify') {
        return decoded.email;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Create API key for service authentication
   */
  createAPIKey(userId: string, name: string): string {
    return jwt.sign(
      { id: userId, name, type: 'api_key' },
      this.secret,
      { expiresIn: '365d' }
    );
  }

  /**
   * Verify API key
   */
  verifyAPIKey(key: string): any {
    try {
      const decoded = jwt.verify(key, this.secret) as any;
      if (decoded.type === 'api_key') {
        return decoded;
      }
      return null;
    } catch {
      return null;
    }
  }
}

/**
 * Authentication middleware for Hono
 */
export function createAuthMiddleware(authAPI: AuthAPI) {
  return (context: any) => {
    const authHeader = context.req.header('Authorization');

    if (!authHeader) {
      return context.json({ error: 'Missing authorization header' }, 401);
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer') {
      return context.json({ error: 'Invalid authorization scheme' }, 401);
    }

    try {
      const user = authAPI.verifyToken(token);
      context.set('user', user);
    } catch (error: any) {
      return context.json({ error: 'Invalid token' }, 401);
    }
  };
}

/**
 * Create Auth API instance
 */
export function createAuthAPI(config: {
  secret: string;
  expiresIn?: string;
}): AuthAPI {
  return new AuthAPI(config);
}
