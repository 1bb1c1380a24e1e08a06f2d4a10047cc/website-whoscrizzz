// Workers for Platforms Template - Test Suite
// Tests the core functionality of the website hosting platform

import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
} from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import app from "../src/index";
import { checkEnvConfig } from "../src/resource";
import { handleDispatchError } from "../src/router";
import { Hono } from "hono";
import type { Env } from "../src/env";

// Type for our test environment
interface TestEnv {
	DB: D1Database;
	dispatcher: {
		get: (name: string) => { fetch: (req: Request) => Promise<Response> };
	};
	DISPATCH_NAMESPACE_NAME: string;
	CUSTOM_DOMAIN: string;
}

describe("Workers for Platforms Template", () => {
	// Helper to make requests to the app
	async function makeRequest(
		path: string,
		options?: RequestInit,
	): Promise<Response> {
		const request = new Request(`http://localhost${path}`, options);
		const ctx = createExecutionContext();
		const response = await app.fetch(request, env as unknown as TestEnv, ctx);
		await waitOnExecutionContext(ctx);
		return response;
	}

	describe("Homepage", () => {
		it("should return the website builder UI on the root path", async () => {
			const response = await makeRequest("/");

			expect(response.status).toBe(200);
			expect(response.headers.get("content-type")).toContain("text/html");

			const html = await response.text();
			expect(html).toContain("Build a Website");
			expect(html).toContain("projectForm");
		});

		it("should include the tab switcher for code/upload modes", async () => {
			const response = await makeRequest("/");
			const html = await response.text();

			expect(html).toContain("Write Code");
			expect(html).toContain("Upload Files");
			expect(html).toContain("tab-switcher");
		});

		it("should include the default Worker code template", async () => {
			const response = await makeRequest("/");
			const html = await response.text();

			expect(html).toContain("export default");
			expect(html).toContain("async fetch(request, env, ctx)");
		});
	});

	describe("Admin Dashboard", () => {
		it("should return the admin dashboard page", async () => {
			const response = await makeRequest("/admin");

			expect(response.status).toBe(200);
			expect(response.headers.get("content-type")).toContain("text/html");

			const html = await response.text();
			expect(html).toContain("Admin Dashboard");
		});

		it("should show projects section on admin page", async () => {
			const response = await makeRequest("/admin");
			const html = await response.text();

			// Check for admin page elements that are always present
			expect(html).toContain("Admin Dashboard");
			expect(html).toContain("Projects");
			// When empty, shows "No projects yet" message
			expect(html).toMatch(/(Subdomain|No projects yet)/);
		});
	});

	describe("Project Creation API", () => {
		it("should reject requests without required fields", async () => {
			const response = await makeRequest("/projects", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});

			expect(response.status).toBe(400);
			const text = await response.text();
			expect(text).toContain("Missing required fields");
		});

		it("should reject invalid subdomain format", async () => {
			const response = await makeRequest("/projects", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Test Project",
					subdomain: "Invalid_Subdomain!",
					script_content:
						"export default { fetch() { return new Response('ok'); } }",
				}),
			});

			expect(response.status).toBe(400);
			const text = await response.text();
			expect(text).toContain("lowercase letters, numbers, and hyphens");
		});

		it("should require either script_content or assets", async () => {
			const response = await makeRequest("/projects", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Test Project",
					subdomain: "test-project",
				}),
			});

			expect(response.status).toBe(400);
			const text = await response.text();
			expect(text).toContain("script_content or assets");
		});
	});

	describe("Static Assets", () => {
		it("should return empty response for favicon", async () => {
			const response = await makeRequest("/favicon.ico");

			expect(response.status).toBe(200);
			const body = await response.text();
			expect(body).toBe("");
		});
	});

	describe("Database Initialization", () => {
		it("should handle /init endpoint for database reset", async () => {
			// Note: This test verifies the endpoint exists and redirects
			// In a real test with proper mocking, we'd verify the database operations
			const response = await makeRequest("/init", { redirect: "manual" });

			// Should redirect back to root after initialization
			expect(response.status).toBe(302);
			expect(response.headers.get("location")).toContain("/");
		});
	});
});

describe("Input Validation", () => {
	async function makeRequest(
		path: string,
		options?: RequestInit,
	): Promise<Response> {
		const request = new Request(`http://localhost${path}`, options);
		const ctx = createExecutionContext();
		const response = await app.fetch(request, env as unknown as TestEnv, ctx);
		await waitOnExecutionContext(ctx);
		return response;
	}

	it("should accept valid subdomain with hyphens", async () => {
		const response = await makeRequest("/projects", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: "My Test Site",
				subdomain: "my-test-site",
				script_content:
					"export default { fetch() { return new Response('ok'); } }",
			}),
		});

		// Will fail due to missing env config in test, but validates input first
		const text = await response.text();
		// Should NOT contain subdomain validation error
		expect(text).not.toContain("lowercase letters, numbers, and hyphens");
	});

	it("should accept valid subdomain with numbers", async () => {
		const response = await makeRequest("/projects", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: "Site 123",
				subdomain: "site123",
				script_content:
					"export default { fetch() { return new Response('ok'); } }",
			}),
		});

		const text = await response.text();
		expect(text).not.toContain("lowercase letters, numbers, and hyphens");
	});
});

// ---------------------------------------------------------------------------
// Asset Validation Tests
// ---------------------------------------------------------------------------

describe("Asset Validation", () => {
	async function makeRequest(
		path: string,
		options?: RequestInit,
	): Promise<Response> {
		const request = new Request(`http://localhost${path}`, options);
		const ctx = createExecutionContext();
		const response = await app.fetch(request, env as unknown as TestEnv, ctx);
		await waitOnExecutionContext(ctx);
		return response;
	}

	beforeEach(async () => {
		await makeRequest("/init", { redirect: "manual" });
	});

	it("should reject assets where all files have empty content", async () => {
		const response = await makeRequest("/projects", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: "Empty Assets",
				subdomain: "empty-assets",
				assets: [{ path: "index.html", content: "", size: 0 }],
			}),
		});

		expect(response.status).toBe(400);
		const text = await response.text();
		expect(text).toContain("No valid files found");
	});

	it("should reject assets that have no index.html", async () => {
		const response = await makeRequest("/projects", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: "No Index",
				subdomain: "no-index",
				assets: [
					{
						path: "styles.css",
						content: btoa("body { color: red; }"),
						size: 20,
					},
					{
						path: "script.js",
						content: btoa("console.log('hello');"),
						size: 21,
					},
				],
			}),
		});

		expect(response.status).toBe(400);
		const text = await response.text();
		expect(text).toContain("No index.html found");
	});

	it("should report found file paths when index.html is missing", async () => {
		const response = await makeRequest("/projects", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: "No Index 2",
				subdomain: "no-index2",
				assets: [
					{
						path: "about.html",
						content: btoa("<html></html>"),
						size: 13,
					},
				],
			}),
		});

		expect(response.status).toBe(400);
		const text = await response.text();
		expect(text).toContain("about.html");
	});

	it("should accept an index.html nested in a subdirectory path", async () => {
		const response = await makeRequest("/projects", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: "Sub Index",
				subdomain: "sub-index",
				assets: [
					{
						path: "public/index.html",
						content: btoa("<html></html>"),
						size: 13,
					},
				],
			}),
		});

		// Passes asset validation - will fail later at network call
		expect(response.status).not.toBe(400);
		const text = await response.text();
		expect(text).not.toContain("No index.html found");
	});
});

// ---------------------------------------------------------------------------
// Duplicate Detection Tests (require DB to be seeded)
// ---------------------------------------------------------------------------

describe("Duplicate Detection", () => {
	async function makeRequest(
		path: string,
		options?: RequestInit,
	): Promise<Response> {
		const request = new Request(`http://localhost${path}`, options);
		const ctx = createExecutionContext();
		const response = await app.fetch(request, env as unknown as TestEnv, ctx);
		await waitOnExecutionContext(ctx);
		return response;
	}

	async function seedProject(
		id: string,
		subdomain: string,
		customHostname: string | null = null,
	) {
		const typedEnv = env as unknown as TestEnv;
		await typedEnv.DB.prepare(
			"INSERT INTO projects (id, name, subdomain, custom_hostname, script_content, created_on, modified_on) VALUES (?, ?, ?, ?, ?, ?, ?)",
		)
			.bind(
				id,
				"Test Site",
				subdomain,
				customHostname,
				"/* test */",
				new Date().toISOString(),
				new Date().toISOString(),
			)
			.run();
	}

	beforeEach(async () => {
		// Reset database so each test starts with a clean slate
		await makeRequest("/init", { redirect: "manual" });
	});

	it("should reject a subdomain that already exists in the database", async () => {
		await seedProject("proj-dup-1", "taken-subdomain");

		const response = await makeRequest("/projects", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: "New Site",
				subdomain: "taken-subdomain",
				script_content:
					"export default { fetch() { return new Response('ok'); } }",
			}),
		});

		expect(response.status).toBe(409);
		const text = await response.text();
		expect(text).toContain("already taken");
	});

	it("should reject a custom hostname that already exists in the database", async () => {
		await seedProject("proj-dup-2", "some-project", "example.com");

		const response = await makeRequest("/projects", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: "Another Site",
				subdomain: "another-subdomain",
				script_content:
					"export default { fetch() { return new Response('ok'); } }",
				custom_hostname: "example.com",
			}),
		});

		expect(response.status).toBe(409);
		const text = await response.text();
		expect(text).toContain("already active on the platform");
	});
});

// ---------------------------------------------------------------------------
// Custom Domain Status Endpoint Tests
// ---------------------------------------------------------------------------

describe("Custom Domain Status Endpoint", () => {
	async function makeRequest(
		path: string,
		options?: RequestInit,
	): Promise<Response> {
		const request = new Request(`http://localhost${path}`, options);
		const ctx = createExecutionContext();
		const response = await app.fetch(request, env as unknown as TestEnv, ctx);
		await waitOnExecutionContext(ctx);
		return response;
	}

	async function seedProject(
		id: string,
		subdomain: string,
		customHostname: string | null = null,
	) {
		const typedEnv = env as unknown as TestEnv;
		await typedEnv.DB.prepare(
			"INSERT INTO projects (id, name, subdomain, custom_hostname, script_content, created_on, modified_on) VALUES (?, ?, ?, ?, ?, ?, ?)",
		)
			.bind(
				id,
				"Test Site",
				subdomain,
				customHostname,
				"/* test */",
				new Date().toISOString(),
				new Date().toISOString(),
			)
			.run();
	}

	beforeEach(async () => {
		await makeRequest("/init", { redirect: "manual" });
	});

	it("should return 404 for a project that does not exist", async () => {
		const response = await makeRequest(
			"/projects/nonexistent/custom-domain-status",
		);
		expect(response.status).toBe(404);
		const text = await response.text();
		expect(text).toBe("Project not found");
	});

	it("should return has_custom_domain=false for a project without a custom hostname", async () => {
		await seedProject("proj-status-1", "no-domain-site");

		const response = await makeRequest(
			"/projects/no-domain-site/custom-domain-status",
		);
		expect(response.status).toBe(200);

		const data = (await response.json()) as { has_custom_domain: boolean };
		expect(data.has_custom_domain).toBe(false);
	});

	it("should include a worker_url in the response when project has no custom domain", async () => {
		await seedProject("proj-status-2", "url-site");

		const response = await makeRequest(
			"/projects/url-site/custom-domain-status",
		);
		expect(response.status).toBe(200);

		const data = (await response.json()) as {
			has_custom_domain: boolean;
			worker_url: string;
		};
		expect(data.worker_url).toBeDefined();
		expect(typeof data.worker_url).toBe("string");
	});
});

// ---------------------------------------------------------------------------
// Unit Tests: checkEnvConfig (resource.ts)
// ---------------------------------------------------------------------------

describe("checkEnvConfig", () => {
	it("should return ok when all required fields are present", () => {
		const result = checkEnvConfig({
			ACCOUNT_ID: "test-account-id",
			DISPATCH_NAMESPACE_API_TOKEN: "test-token",
			DISPATCH_NAMESPACE_NAME: "test-ns",
		} as unknown as Env);
		expect(result.ok).toBe(true);
		expect(result.missing).toHaveLength(0);
	});

	it("should report ACCOUNT_ID as missing when absent", () => {
		const result = checkEnvConfig({
			DISPATCH_NAMESPACE_API_TOKEN: "test-token",
			DISPATCH_NAMESPACE_NAME: "test-ns",
		} as unknown as Env);
		expect(result.ok).toBe(false);
		expect(result.missing).toContain("ACCOUNT_ID");
	});

	it("should report DISPATCH_NAMESPACE_API_TOKEN as missing when absent", () => {
		const result = checkEnvConfig({
			ACCOUNT_ID: "test-account-id",
			DISPATCH_NAMESPACE_NAME: "test-ns",
		} as unknown as Env);
		expect(result.ok).toBe(false);
		expect(result.missing).toContain("DISPATCH_NAMESPACE_API_TOKEN");
	});

	it("should report DISPATCH_NAMESPACE_NAME as missing when empty string", () => {
		const result = checkEnvConfig({
			ACCOUNT_ID: "test-account-id",
			DISPATCH_NAMESPACE_API_TOKEN: "test-token",
			DISPATCH_NAMESPACE_NAME: "",
		} as unknown as Env);
		expect(result.ok).toBe(false);
		expect(result.missing).toContain("DISPATCH_NAMESPACE_NAME");
	});

	it("should report all three fields missing when env has none", () => {
		const result = checkEnvConfig({
			DISPATCH_NAMESPACE_NAME: "",
		} as unknown as Env);
		expect(result.ok).toBe(false);
		expect(result.missing).toContain("ACCOUNT_ID");
		expect(result.missing).toContain("DISPATCH_NAMESPACE_API_TOKEN");
		expect(result.missing).toContain("DISPATCH_NAMESPACE_NAME");
		expect(result.missing).toHaveLength(3);
	});
});

// ---------------------------------------------------------------------------
// Unit Tests: handleDispatchError (router.ts)
// ---------------------------------------------------------------------------

describe("handleDispatchError", () => {
	it("should return 404 when error message starts with 'Worker not found'", async () => {
		const honoApp = new Hono();
		honoApp.get("/test", (c) => {
			const err = new Error("Worker not found: no-such-worker");
			return handleDispatchError(c, err);
		});

		const req = new Request("http://localhost/test");
		const res = await honoApp.fetch(req);
		expect(res.status).toBe(404);
		const text = await res.text();
		expect(text).toBe("Script does not exist");
	});

	it("should return 500 for generic dispatch errors", async () => {
		const honoApp = new Hono();
		honoApp.get("/test", (c) => {
			const err = new Error("Connection refused");
			return handleDispatchError(c, err);
		});

		const req = new Request("http://localhost/test");
		const res = await honoApp.fetch(req);
		expect(res.status).toBe(500);
		const text = await res.text();
		expect(text).toBe("Could not connect to script");
	});

	it("should return 500 for non-Error exceptions", async () => {
		const honoApp = new Hono();
		honoApp.get("/test", (c) => {
			return handleDispatchError(c, "string error");
		});

		const req = new Request("http://localhost/test");
		const res = await honoApp.fetch(req);
		expect(res.status).toBe(500);
		const text = await res.text();
		expect(text).toBe("Could not connect to script");
	});
});

// ---------------------------------------------------------------------------
// Reserved Path Routing Tests
// ---------------------------------------------------------------------------

describe("Reserved Path Routing", () => {
	async function makeRequest(
		path: string,
		options?: RequestInit,
	): Promise<Response> {
		const request = new Request(`http://localhost${path}`, options);
		const ctx = createExecutionContext();
		const response = await app.fetch(request, env as unknown as TestEnv, ctx);
		await waitOnExecutionContext(ctx);
		return response;
	}

	it("should serve the platform admin UI and not dispatch to a worker", async () => {
		const response = await makeRequest("/admin");
		expect(response.status).toBe(200);
		const html = await response.text();
		expect(html).toContain("Admin Dashboard");
	});

	it("should serve the favicon route without dispatching", async () => {
		const response = await makeRequest("/favicon.ico");
		expect(response.status).toBe(200);
		expect(await response.text()).toBe("");
	});

	it("should serve the root builder page without dispatching", async () => {
		const response = await makeRequest("/");
		expect(response.status).toBe(200);
		const html = await response.text();
		expect(html).toContain("Build a Website");
	});
});
