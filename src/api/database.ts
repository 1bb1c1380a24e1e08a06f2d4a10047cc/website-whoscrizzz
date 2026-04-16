import { QueryResult, Pagination } from '@/types';

/**
 * Database API for Cloudflare D1
 * Provides a unified interface for database operations
 */
export class DatabaseAPI {
  constructor(private db: any) {}

  /**
   * Execute a raw SQL query
   */
  async execute<T = any>(sql: string, params?: any[]): Promise<QueryResult> {
    const startTime = Date.now();

    try {
      const statement = this.db.prepare(sql);
      const boundStatement = params ? statement.bind(...params) : statement;
      const result = await boundStatement.all();

      return {
        success: true,
        data: result.results as T[],
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown database error',
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Get a single record
   */
  async findOne<T = any>(
    table: string,
    where: Record<string, any>
  ): Promise<T | null> {
    const conditions = Object.entries(where)
      .map(([key]) => `${key} = ?`)
      .join(' AND ');

    const values = Object.values(where);

    const result = await this.execute(
      `SELECT * FROM ${table} WHERE ${conditions} LIMIT 1`,
      values
    );

    return result.success ? (result.data?.[0] as T) : null;
  }

  /**
   * Get multiple records with pagination
   */
  async findMany<T = any>(
    table: string,
    where?: Record<string, any>,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      orderDirection?: 'ASC' | 'DESC';
    }
  ): Promise<{ data: T[]; pagination: Pagination }> {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    let query = `SELECT * FROM ${table}`;
    const params: any[] = [];

    // WHERE clause
    if (where && Object.keys(where).length > 0) {
      const conditions = Object.entries(where)
        .map(([key]) => `${key} = ?`)
        .join(' AND ');
      query += ` WHERE ${conditions}`;
      params.push(...Object.values(where));
    }

    // ORDER BY clause
    if (options?.orderBy) {
      const direction = options?.orderDirection || 'ASC';
      query += ` ORDER BY ${options.orderBy} ${direction}`;
    }

    // Get total count
    const countResult = await this.execute(
      `SELECT COUNT(*) as count FROM ${table}${where ? ` WHERE ${Object.entries(where).map(([key]) => `${key} = ?`).join(' AND ')}` : ''}`,
      where ? Object.values(where) : []
    );

    const total = countResult.success ? countResult.data?.[0]?.count || 0 : 0;

    // Get paginated data
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const result = await this.execute(query, params);

    return {
      data: (result.success ? result.data : []) as T[],
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Create a new record
   */
  async create<T = any>(
    table: string,
    data: Record<string, any>
  ): Promise<T | null> {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(data);

    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;

    const result = await this.execute(sql, values);

    return result.success ? (data as T) : null;
  }

  /**
   * Update records
   */
  async update(
    table: string,
    data: Record<string, any>,
    where: Record<string, any>
  ): Promise<boolean> {
    const setClause = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(', ');

    const whereClause = Object.entries(where)
      .map(([key]) => `${key} = ?`)
      .join(' AND ');

    const values = [...Object.values(data), ...Object.values(where)];

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    const result = await this.execute(sql, values);

    return result.success;
  }

  /**
   * Delete records
   */
  async delete(
    table: string,
    where: Record<string, any>
  ): Promise<boolean> {
    const whereClause = Object.entries(where)
      .map(([key]) => `${key} = ?`)
      .join(' AND ');

    const values = Object.values(where);

    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
    const result = await this.execute(sql, values);

    return result.success;
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(
    callback: (db: this) => Promise<T>
  ): Promise<T | null> {
    try {
      await this.execute('BEGIN TRANSACTION');
      const result = await callback(this);
      await this.execute('COMMIT');
      return result;
    } catch (error) {
      await this.execute('ROLLBACK');
      throw error;
    }
  }

  /**
   * Check if table exists
   */
  async tableExists(table: string): Promise<boolean> {
    const result = await this.execute(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [table]
    );

    return result.success && result.data && result.data.length > 0;
  }

  /**
   * Get table schema
   */
  async getTableSchema(table: string): Promise<any[]> {
    const result = await this.execute(`PRAGMA table_info(${table})`);
    return result.success ? (result.data || []) : [];
  }

  /**
   * Migrate database schema
   */
  async migrate(migrations: Array<{
    name: string;
    up: string;
    down: string;
  }>): Promise<void> {
    // Check if migrations table exists
    const migrationsTableExists = await this.tableExists('_migrations');

    if (!migrationsTableExists) {
      await this.execute(`
        CREATE TABLE _migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          executedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // Execute pending migrations
    for (const migration of migrations) {
      const executed = await this.findOne('_migrations', { name: migration.name });

      if (!executed) {
        await this.transaction(async (db) => {
          await db.execute(migration.up);
          await db.create('_migrations', { name: migration.name });
        });
      }
    }
  }
}

/**
 * Create a database API instance for Cloudflare Workers
 */
export function createDatabaseAPI(env: { DB?: any }): DatabaseAPI {
  if (!env.DB) {
    throw new Error('Database binding not found in environment');
  }

  return new DatabaseAPI(env.DB);
}
