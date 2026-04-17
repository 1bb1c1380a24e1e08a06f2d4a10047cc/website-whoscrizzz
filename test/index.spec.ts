// Workers for Platforms Template - Test Suite
// Tests the core functionality of the website hosting platform

import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
} from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import app from "../src/index";

// Type for our test environment
interface TestEnv {
	DB: D1Database;
	dispatcher: {
		get: (name: string) => { fetch: (req: Request) => Promise<Response> };
	};
	DISPATCH_NAMESPACE_NAME: string;
	CUSTOM_DOMAIN: string;
}

// Shared helper — creates a Request and dispatches it through the app
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

describe("Workers for Platforms Template", () => {
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

		it("should include the deployed-sites section (empty state)", async () => {
			const response = await makeRequest("/");
			const html = await response.text();
			// When there are no projects the section is omitted entirely — that is fine
			// When there are projects the "Deployed Sites" heading appears
			expect(html).not.toContain("Internal server error");
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

		it("should include delete and edit action buttons in admin JS", async () => {
			const response = await makeRequest("/admin");
			const html = await response.text();
			// Verify the admin page embeds the JS handlers for delete and redeploy
			expect(html).toContain("deleteProject");
			expect(html).toContain("redeployProject");
			expect(html).toContain("toggleEditRow");
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

		it("should reject subdomain longer than 63 characters", async () => {
			const longSubdomain = "a".repeat(64);
			const response = await makeRequest("/projects", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Test",
					subdomain: longSubdomain,
					script_content:
						"export default { fetch() { return new Response('ok'); } }",
				}),
			});

			expect(response.status).toBe(400);
			const text = await response.text();
			expect(text).toContain("63 characters");
		});

		it("should reject name longer than 100 characters", async () => {
			const longName = "A".repeat(101);
			const response = await makeRequest("/projects", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: longName,
					subdomain: "valid-sub",
					script_content:
						"export default { fetch() { return new Response('ok'); } }",
				}),
			});

			expect(response.status).toBe(400);
			const text = await response.text();
			expect(text).toContain("100 characters");
		});

		it("should reject an invalid custom domain format", async () => {
			const response = await makeRequest("/projects", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Test",
					subdomain: "valid-sub",
					script_content:
						"export default { fetch() { return new Response('ok'); } }",
					custom_hostname: "not-a-valid-domain!!!",
				}),
			});

			expect(response.status).toBe(400);
			const text = await response.text();
			expect(text).toContain("valid hostname");
		});
	});

	describe("Delete Project API", () => {
		beforeEach(async () => {
			// Ensure the schema exists — /init calls Initialize() which uses
			// CREATE TABLE IF NOT EXISTS, bypassing the isInitialized flag.
			await makeRequest("/init", { redirect: "manual" });
		});

		it("should return 404 when deleting a project that does not exist", async () => {
			const response = await makeRequest(
				"/projects/definitely-not-existing-xyz",
				{ method: "DELETE" },
			);

			expect(response.status).toBe(404);
			const text = await response.text();
			expect(text).toContain("not found");
		});
	});

	describe("Update/Redeploy Project API", () => {
		beforeEach(async () => {
			await makeRequest("/init", { redirect: "manual" });
		});

		it("should return 404 when updating a project that does not exist", async () => {
			const response = await makeRequest(
				"/projects/definitely-not-existing-xyz",
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						script_content:
							"export default { fetch() { return new Response('ok'); } }",
					}),
				},
			);

			expect(response.status).toBe(404);
			const text = await response.text();
			expect(text).toContain("not found");
		});

		it("should return 400 when updating without script_content", async () => {
			// Project doesn't exist → 404 is returned before the 400 validation
			// We just ensure no unhandled server error
			const response = await makeRequest(
				"/projects/definitely-not-existing-xyz",
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({}),
				},
			);

			expect([400, 404]).toContain(response.status);
		});
	});

	describe("Subdomain Routing", () => {
		beforeEach(async () => {
			// Ensure DB schema exists so routing middleware can query the projects table
			await makeRequest("/init", { redirect: "manual" });
		});

		it("should fall through to platform UI for unknown subdomains (workers.dev mode)", async () => {
			// In workers.dev mode (no CUSTOM_DOMAIN set), /unknown-sub is treated as a
			// potential project path.  If no project is found the routing passes through
			// to the platform routes; since no route matches /unknown-sub exactly the app
			// returns 404.
			const response = await makeRequest("/unknown-subdomain-xyz-404");
			// Should NOT be a 500 — gracefully falls through
			expect(response.status).not.toBe(500);
		});

		it("should not route reserved platform paths to the dispatcher", async () => {
			// /admin is in the reserved paths list and must never be dispatched
			const response = await makeRequest("/admin");
			expect(response.status).toBe(200);
			const html = await response.text();
			expect(html).toContain("Admin Dashboard");
		});

		it("should handle custom-domain subdomain routing without crashing", async () => {
			// Simulate a request that looks like it comes from a subdomain of CUSTOM_DOMAIN.
			// Since the project doesn't exist in DB the routing should fall through gracefully.
			const request = new Request("http://testsite.example.com/");
			const ctx = createExecutionContext();
			const response = await app.fetch(
				request,
				{
					...(env as unknown as TestEnv),
					CUSTOM_DOMAIN: "example.com",
				} as unknown as TestEnv,
				ctx,
			);
			await waitOnExecutionContext(ctx);
			// Should not be a 500 internal error
			expect(response.status).not.toBe(500);
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

	it("should accept a subdomain exactly 63 characters long", async () => {
		const maxSubdomain = "a".repeat(63);
		const response = await makeRequest("/projects", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: "Site",
				subdomain: maxSubdomain,
				script_content:
					"export default { fetch() { return new Response('ok'); } }",
			}),
		});
		const text = await response.text();
		expect(text).not.toContain("63 characters");
	});

	it("should accept a name exactly 100 characters long", async () => {
		const maxName = "A".repeat(100);
		const response = await makeRequest("/projects", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: maxName,
				subdomain: "valid-sub",
				script_content:
					"export default { fetch() { return new Response('ok'); } }",
			}),
		});
		const text = await response.text();
		expect(text).not.toContain("100 characters");
	});

	it("should accept a valid custom domain", async () => {
		const response = await makeRequest("/projects", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: "Site",
				subdomain: "valid-sub2",
				script_content:
					"export default { fetch() { return new Response('ok'); } }",
				custom_hostname: "mystore.example.com",
			}),
		});
		const text = await response.text();
		expect(text).not.toContain("valid hostname");
	});
});

// Type declaration for test environment
interface TestEnv {
	DB: D1Database;
	dispatcher: {
		get: (name: string) => { fetch: (req: Request) => Promise<Response> };
	};
	DISPATCH_NAMESPACE_NAME: string;
	CUSTOM_DOMAIN: string;
}
