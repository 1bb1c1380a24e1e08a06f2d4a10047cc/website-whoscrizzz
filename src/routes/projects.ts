// Copyright (c) 2022 Cloudflare, Inc.
// Licensed under the APACHE LICENSE, VERSION 2.0 license found in the LICENSE file or at http://www.apache.org/licenses/LICENSE-2.0

/**
 * Project Routes
 *
 * This handles two types of deployments:
 * 1. Code deployment: User provides raw Worker script code
 * 2. Static site deployment: User uploads files (HTML, CSS, JS, images)
 *
 * For static sites, files are deployed using the Workers Assets API,
 * which optimizes serving of static content from Cloudflare's edge.
 *
 * Custom domains are set up using Cloudflare for SaaS (custom hostnames),
 * which handles SSL certificate provisioning automatically.
 */

import { Hono } from "hono";
import { D1QB } from "workers-qb";

import { Env } from "../env";
import {
	GetProjectBySubdomain,
	GetProjectByCustomHostname,
	CreateProject,
} from "../lib/db";
import {
	PutScriptInDispatchNamespace,
	PutScriptWithAssetsInDispatchNamespace,
	AssetFile,
	checkEnvConfig,
} from "../lib/resource";
import { createCustomHostname, getCustomHostnameStatus } from "../lib/cloudflare-api";
import { Project } from "../types";

const projectRoutes = new Hono<{ Bindings: Env; Variables: { db: D1QB } }>();

/*
 * Create a new project (website)
 */
projectRoutes.post("/projects", async (c) => {
	try {
		// Check if required env vars are set
		const envCheck = checkEnvConfig(c.env);
		if (!envCheck.ok) {
			console.error("Missing env vars:", envCheck.missing);
			return c.text(
				`Server configuration error: Missing ${envCheck.missing.join(", ")}. Please check deployment settings.`,
				500,
			);
		}

		const { name, subdomain, script_content, custom_hostname, assets } =
			await c.req.json();

		// Validate input - either script_content OR assets required
		if (!name || !subdomain) {
			return c.text("Missing required fields: name, subdomain", 400);
		}

		if (!script_content && (!assets || assets.length === 0)) {
			return c.text("Missing required fields: script_content or assets", 400);
		}

		// Validate subdomain format
		if (!/^[a-z0-9-]+$/.test(subdomain)) {
			return c.text(
				"Subdomain must only contain lowercase letters, numbers, and hyphens",
				400,
			);
		}

		// Check if subdomain already exists
		const existingProject = await GetProjectBySubdomain(c.var.db, subdomain);
		if (existingProject) {
			return c.text(
				"This URL is already taken. Please choose a different name.",
				409,
			);
		}

		// Check if custom hostname already exists
		if (custom_hostname) {
			const existingCustomHostname = await GetProjectByCustomHostname(
				c.var.db,
				custom_hostname,
			);
			if (existingCustomHostname) {
				return c.text("This domain is already active on the platform", 409);
			}
		}

		// Deploy based on whether we have assets or just script
		let scriptPlaceholder: string;

		if (assets && assets.length > 0) {
			// Validate assets have content
			const validAssets = assets.filter(
				(a: AssetFile) => a.path && a.content && a.content.length > 0,
			);
			if (validAssets.length === 0) {
				return c.text(
					"No valid files found. Files may be empty or unsupported.",
					400,
				);
			}

			// Check for index.html
			const hasIndex = validAssets.some((a: AssetFile) => {
				const p = a.path.toLowerCase();
				return p === "index.html" || p.endsWith("/index.html");
			});

			if (!hasIndex) {
				const samplePaths = validAssets
					.slice(0, 5)
					.map((a: AssetFile) => a.path)
					.join(", ");
				return c.text(
					`No index.html found. Your site needs an index.html file. Found: ${samplePaths}${validAssets.length > 5 ? "..." : ""}`,
					400,
				);
			}

			const deployResult = await PutScriptWithAssetsInDispatchNamespace(
				c.env,
				subdomain,
				validAssets as AssetFile[],
			);

			if (!deployResult.success) {
				return c.text(`Failed to deploy website: ${deployResult.error}`, 500);
			}

			scriptPlaceholder = `/* Static site with ${validAssets.length} assets deployed via Assets API */`;
		} else {
			// Deploy regular script
			const deployResult = await PutScriptInDispatchNamespace(
				c.env,
				subdomain,
				script_content,
			);
			if (!deployResult.ok) {
				return c.text("Failed to deploy website. Please try again.", 500);
			}

			// Store placeholder for large scripts
			scriptPlaceholder =
				script_content.length > 1000
					? `/* Script deployed to dispatch namespace - ${script_content.length} bytes */`
					: script_content;
		}

		const project: Project = {
			id: `project-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
			name,
			subdomain,
			custom_hostname: custom_hostname || null,
			script_content: scriptPlaceholder,
			created_on: new Date().toISOString(),
			modified_on: new Date().toISOString(),
		};

		// Save to database
		await CreateProject(c.var.db, project);

		// Create custom hostname if provided
		if (custom_hostname) {
			await createCustomHostname(c.env, custom_hostname);
		}

		return c.text("Project created successfully", 201);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		console.error("POST /projects error:", errorMessage, error);
		return c.text(`Internal server error: ${errorMessage}`, 500);
	}
});

/*
 * Check custom domain status
 */
projectRoutes.get(
	"/projects/:subdomain/custom-domain-status",
	async (c) => {
		try {
			const subdomain = c.req.param("subdomain");

			// Get project by subdomain
			const project = await GetProjectBySubdomain(c.var.db, subdomain);
			if (!project) {
				return c.text("Project not found", 404);
			}

			// Check if project has custom hostname
			if (!project.custom_hostname) {
				return c.json({
					has_custom_domain: false,
					worker_url: c.env.CUSTOM_DOMAIN
						? `https://${subdomain}.${c.env.CUSTOM_DOMAIN}`
						: `https://${c.env.WORKERS_DEV_SUBDOMAIN || "my-worker"}.workers.dev/${subdomain}`,
				});
			}

			// Get custom hostname status from Cloudflare
			const status = await getCustomHostnameStatus(
				c.env,
				project.custom_hostname,
			);

			return c.json({
				has_custom_domain: true,
				custom_domain: project.custom_hostname,
				status: status.status,
				ssl_status: status.ssl?.status,
				verification_errors: status.verification_errors || [],
				worker_url: c.env.CUSTOM_DOMAIN
					? `https://${subdomain}.${c.env.CUSTOM_DOMAIN}`
					: `https://${c.env.WORKERS_DEV_SUBDOMAIN || "my-worker"}.workers.dev/${subdomain}`,
				is_active: status.status === "active",
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			return c.text(`Internal server error: ${errorMessage}`, 500);
		}
	},
);

export default projectRoutes;
