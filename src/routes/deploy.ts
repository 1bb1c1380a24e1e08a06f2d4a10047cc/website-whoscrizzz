// Copyright (c) 2022 Cloudflare, Inc.
// Licensed under the APACHE LICENSE, VERSION 2.0 license found in the LICENSE file or at http://www.apache.org/licenses/LICENSE-2.0

/**
 * Request Routing Middleware
 *
 * This is the core of the multi-tenant routing system. It intercepts all requests
 * and determines whether to:
 * 1. Serve the platform UI (root domain requests)
 * 2. Dispatch to a user's Worker (subdomain or custom hostname requests)
 *
 * Routing modes:
 * - WITH custom domain: site1.platform.com → dispatches to "site1" Worker
 * - WITHOUT custom domain: platform.workers.dev/site1 → dispatches to "site1" Worker
 * - Custom hostname: user-domain.com → looks up in DB, dispatches to associated Worker
 */

import { MiddlewareHandler } from "hono";
import { D1QB } from "workers-qb";

import { Env } from "../env";
import { GetProjectBySubdomain, GetProjectByCustomHostname } from "../lib/db";
import { PutScriptInDispatchNamespace } from "../lib/resource";
import { Project } from "../types";

export const dispatchMiddleware: MiddlewareHandler<{
	Bindings: Env;
	Variables: { db: D1QB };
}> = async (c, next) => {
	const customDomain = c.env.CUSTOM_DOMAIN;
	const url = new URL(c.req.url);
	const host = url.hostname;
	const path = url.pathname;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let project: Project | null = null;

	if (customDomain) {
		// Custom domain mode: route based on subdomain or custom hostname

		// Root domain requests go to the platform UI
		if (host === customDomain) {
			await next();
			return;
		}

		// Check if this is a subdomain of our platform (e.g., site1.platform.com)
		if (host.endsWith(`.${customDomain}`)) {
			const subdomain = host.replace(`.${customDomain}`, "");
			project = await GetProjectBySubdomain(c.var.db, subdomain);
		} else {
			// Not a subdomain - check if it's a custom hostname (user's own domain)
			// This enables Cloudflare for SaaS functionality
			project = await GetProjectByCustomHostname(c.var.db, host);
		}
	} else {
		// Workers.dev mode: route based on path (e.g., myworker.workers.dev/site1)
		if (path.startsWith("/") && path.length > 1) {
			const subdomain = path.substring(1).split("/")[0];

			// Reserved paths for platform functionality
			if (
				[
					"admin",
					"projects",
					"upload",
					"init",
					"dispatch",
					"favicon.ico",
				].includes(subdomain)
			) {
				await next();
				return;
			}

			project = await GetProjectBySubdomain(c.var.db, subdomain);
		}
	}

	// If we found a matching project, dispatch the request to the user's Worker
	if (project) {
		try {
			let requestToForward = c.req.raw;

			// In workers.dev mode, strip the project name from the path
			// so /site1/page becomes /page for the dispatched Worker
			if (!customDomain || !host.endsWith(`.${customDomain}`)) {
				const subdomain = path.substring(1).split("/")[0];
				const newUrl = new URL(c.req.url);
				newUrl.pathname = path.substring(subdomain.length + 1) || "/";
				requestToForward = new Request(newUrl.toString(), {
					method: c.req.method,
					headers: c.req.headers,
					body: c.req.body,
				});
			}

			// Use the dispatcher binding to route to the user's Worker
			// The dispatcher.get() returns a stub for the Worker with that name
			const worker = c.env.dispatcher.get(project.subdomain);
			return await worker.fetch(requestToForward);
		} catch (e) {
			// Worker may not be deployed yet - deploy it from stored script content
			await PutScriptInDispatchNamespace(
				c.env,
				project.subdomain,
				project.script_content,
			);
			const worker = c.env.dispatcher.get(project.subdomain);

			let requestToForward = c.req.raw;
			if (!customDomain || !host.endsWith(`.${customDomain}`)) {
				const subdomain = path.substring(1).split("/")[0];
				const newUrl = new URL(c.req.url);
				newUrl.pathname = path.substring(subdomain.length + 1) || "/";
				requestToForward = new Request(newUrl.toString(), {
					method: c.req.method,
					headers: c.req.headers,
					body: c.req.body,
				});
			}

			return await worker.fetch(requestToForward);
		}
	}

	// No matching project - continue to platform routes
	await next();
};
