// Copyright (c) 2022 Cloudflare, Inc.
// Licensed under the APACHE LICENSE, VERSION 2.0 license found in the LICENSE file or at http://www.apache.org/licenses/LICENSE-2.0

/**
 * Website Builder
 *
 * This template demonstrates how to build a multi-tenant website hosting platform
 * using Cloudflare Workers for Platforms. Key concepts:
 *
 * 1. DISPATCH NAMESPACE: A container that holds multiple Worker scripts.
 *    Each user's website is deployed as a separate Worker within this namespace.
 *    The dispatcher binding allows routing requests to the appropriate user Worker.
 *
 * 2. D1 DATABASE: Stores project metadata (names, subdomains, custom domains).
 *    Used to look up which Worker to dispatch to based on the incoming request.
 *
 * 3. CUSTOM HOSTNAMES: Cloudflare for SaaS feature that allows users to bring
 *    their own domains with automatic SSL certificate provisioning.
 *
 * 4. HONO ROUTER: Lightweight web framework for handling HTTP routes.
 *    Provides middleware support and type-safe request handling.
 */

import { Hono } from "hono";

import type { Env } from "./env";
import { withDbAndInit } from "./middleware/db";
import { dispatchMiddleware } from "./routes/deploy";
import uiRoutes from "./routes/ui";
import projectRoutes from "./routes/projects";

// Initialize Hono app with type-safe environment bindings
const app = new Hono<{ Bindings: Env }>();

// Apply DB initialization and dispatch routing to all requests
app.use("*", withDbAndInit, dispatchMiddleware);

// Mount platform UI routes (/, /admin, /init, /favicon.ico)
app.route("/", uiRoutes);

// Mount project API routes (/projects, /projects/:subdomain/custom-domain-status)
app.route("/", projectRoutes);

export default app;
