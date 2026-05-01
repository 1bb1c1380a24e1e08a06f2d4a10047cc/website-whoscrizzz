// Copyright (c) 2022 Cloudflare, Inc.
// Licensed under the APACHE LICENSE, VERSION 2.0 license found in the LICENSE file or at http://www.apache.org/licenses/LICENSE-2.0

import { Context, MiddlewareHandler } from "hono";

import { D1QB } from "workers-qb";

import { Env } from "../env";

export const withDb: MiddlewareHandler<{
	Bindings: Env;
	Variables: { db: D1QB };
}> = async (c, next) => {
	c.set("db", new D1QB(c.env.DB));
	await next();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleDispatchError(c: Context, e: any): Response {
	if (e instanceof Error && e.message.startsWith("Worker not found")) {
		return c.text("Script does not exist", 404);
	}
	return c.text("Could not connect to script", 500);
}

// Track database initialization state across requests in this Worker instance
let isInitialized = false;

export async function autoInitializeDatabase(db: D1QB): Promise<void> {
	if (isInitialized) {
		return; // Already initialized in this worker instance
	}

	try {
		// Check if projects table exists by trying to query it
		const tableCheck = await db.fetchOne({
			tableName: "sqlite_master",
			fields: "name",
			where: {
				conditions: "type = ? AND name = ?",
				params: ["table", "projects"],
			},
		});

		if (!tableCheck.results) {
			// Create projects table
			await db.createTable({
				tableName: "projects",
				schema:
					"id TEXT PRIMARY KEY, name TEXT NOT NULL, subdomain TEXT UNIQUE NOT NULL, custom_hostname TEXT, script_content TEXT NOT NULL, created_on TEXT NOT NULL, modified_on TEXT NOT NULL",
				ifNotExists: true,
			});
		}

		isInitialized = true;
	} catch (error) {
		// Don't throw - let the app continue, it might work anyway
		// Set flag to true to avoid repeated attempts
		isInitialized = true;
	}
}

// Enhanced withDb middleware that includes auto-initialization
export const withDbAndInit: MiddlewareHandler<{
	Bindings: Env;
	Variables: { db: D1QB };
}> = async (c, next) => {
	c.set("db", new D1QB(c.env.DB));
	if (!isInitialized && c.var.db) {
		await autoInitializeDatabase(c.var.db);
	}
	await next();
};
