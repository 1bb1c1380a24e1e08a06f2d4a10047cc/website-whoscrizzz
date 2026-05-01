// Copyright (c) 2022 Cloudflare, Inc.
// Licensed under the APACHE LICENSE, VERSION 2.0 license found in the LICENSE file or at http://www.apache.org/licenses/LICENSE-2.0

import { Hono } from "hono";
import { D1QB } from "workers-qb";

import { Env } from "../env";
import { FetchTable, Initialize } from "../lib/db";
import { renderPage, BuildTable, BuildWebsitePage } from "../lib/render";
import {
	GetScriptsInDispatchNamespace,
	DeleteScriptInDispatchNamespace,
} from "../lib/resource";
import { getCustomHostnameStatus } from "../lib/cloudflare-api";
import { Project } from "../types";

const uiRoutes = new Hono<{ Bindings: Env; Variables: { db: D1QB } }>();

uiRoutes.get("/favicon.ico", () => {
	return new Response();
});

/*
 * Main page - Build a website interface
 */
uiRoutes.get("/", (c) => {
	const customDomain = c.env.CUSTOM_DOMAIN;
	return c.html(renderPage(BuildWebsitePage, { customDomain }));
});

/*
 * Admin page - For debugging/management (hidden)
 */
uiRoutes.get("/admin", async (c) => {
	let body = `
    <div class="form-container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0;">Admin Dashboard</h3>
        <form action="/init" style="margin: 0;">
          <button type="submit" class="btn btn-destructive btn-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"/></svg>
            Reset All Data
          </button>
        </form>
      </div>
      <p style="font-size: 13px; color: var(--kumo-muted-foreground); margin-bottom: 20px;">Manage projects and view dispatch namespace scripts.</p>
      
      <div class="success-card-label" style="margin-top: 24px;">Projects</div>`;

	/*
	 * DB data with custom hostname status
	 */
	try {
		const projects = (await FetchTable(c.var.db, "projects")) as Project[];
		if (projects && projects.length > 0) {
			body += `
        <div class="dataContainer">
          <table class="dataTable">
            <tr>
              <th>Name</th>
              <th>Subdomain</th>
              <th>Custom Domain</th>
              <th>Hostname Status</th>
              <th>SSL Status</th>
              <th>Actions</th>
            </tr>`;

			for (const project of projects) {
				const subdomain = project.subdomain;
				const customHostname = project.custom_hostname || "-";
				let hostnameStatus = "-";
				let sslStatus = "-";
				let hostnameErrors: string[] = [];
				let sslErrors: string[] = [];
				let sslMethod = "";

				if (project.custom_hostname) {
					try {
						const status = await getCustomHostnameStatus(
							c.env,
							project.custom_hostname,
						);
						hostnameStatus = status.status;
						sslStatus = status.ssl?.status || "-";
						hostnameErrors = status.verification_errors || [];
						sslErrors = status.ssl?.validation_errors || [];
						sslMethod = status.ssl?.validation_method || "";
					} catch {
						hostnameStatus = "error";
					}
				}

				const statusBadge = (status: string) => {
					if (status === "active")
						return `<span class="status-badge status-active">Active</span>`;
					if (
						status === "pending" ||
						status === "pending_validation" ||
						status === "pending_issuance" ||
						status === "pending_deployment"
					)
						return `<span class="status-badge status-pending">${status.replace(/_/g, " ")}</span>`;
					if (
						status === "error" ||
						status === "deleted" ||
						status === "validation_timed_out" ||
						status === "expired"
					)
						return `<span class="status-badge status-error">${status.replace(/_/g, " ")}</span>`;
					if (status === "-") return "-";
					return `<span class="status-badge status-pending">${status.replace(/_/g, " ")}</span>`;
				};

				// Helper to get user-friendly error message
				const getFriendlyError = (errors: string[]) => {
					const rawError = errors.join(" ").toLowerCase();

					const fallbackOrigin =
						c.env.FALLBACK_ORIGIN ||
						(c.env.CUSTOM_DOMAIN
							? `my.${c.env.CUSTOM_DOMAIN}`
							: "your-platform-domain");
					if (
						rawError.includes("a or aaaa records") ||
						rawError.includes("ownership verification")
					) {
						return `Your domain is not pointing to our servers. Add a CNAME record pointing to <strong>${fallbackOrigin}</strong> and wait for DNS propagation (can take up to 24 hours).`;
					}
					if (rawError.includes("cname") && rawError.includes("not found")) {
						return `CNAME record not found. Add a CNAME record pointing to <strong>${fallbackOrigin}</strong>.`;
					}
					if (rawError.includes("timeout") || rawError.includes("timed out")) {
						return "Verification timed out. Please check your DNS settings and try again.";
					}

					// Return original if no match
					return errors.join("<br>");
				};

				// Helper to get user-friendly SSL status message
				const getSSLMessage = (status: string, method: string) => {
					const sslFallbackOrigin =
						c.env.FALLBACK_ORIGIN ||
						(c.env.CUSTOM_DOMAIN
							? `my.${c.env.CUSTOM_DOMAIN}`
							: "your-platform-domain");
					const messages: Record<string, string> = {
						pending_validation:
							"Waiting for SSL certificate validation. This happens automatically once DNS is verified.",
						pending_issuance:
							"SSL certificate is being issued. This usually takes a few minutes.",
						pending_deployment:
							"SSL certificate is being deployed to edge servers.",
						validation_timed_out: `SSL validation timed out. Make sure your domain points to <strong>${sslFallbackOrigin}</strong> and click refresh.`,
						expired: "SSL certificate has expired and needs renewal.",
						initializing: "SSL certificate is being set up.",
					};
					return messages[status] || "";
				};

				const hasHostnameErrors =
					hostnameErrors.length > 0 && hostnameStatus !== "active";
				const hasSSLDetails = sslStatus !== "active" && sslStatus !== "-";
				const rowId = `row-${subdomain}`;

				body += `
          <tr>
            <td>${project.name}</td>
            <td><a href="${c.env.CUSTOM_DOMAIN ? `https://${subdomain}.${c.env.CUSTOM_DOMAIN}` : `https://${subdomain}.workers.dev`}" target="_blank" class="table-link">${subdomain}</a></td>
            <td>${customHostname !== "-" ? `<a href="https://${customHostname}" target="_blank" class="table-link">${customHostname}</a>` : "-"}</td>
            <td class="status-cell">
              <div class="status-row">
                ${statusBadge(hostnameStatus)}
                ${hasHostnameErrors ? `<button type="button" class="btn-icon" onclick="toggleDetails('${rowId}-hostname')" title="Show details"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/></svg></button>` : ""}
              </div>
              ${hasHostnameErrors ? `<div id="${rowId}-hostname" class="status-details error" style="display: none;"><div class="status-details-item">${getFriendlyError(hostnameErrors)}</div></div>` : ""}
            </td>
            <td class="status-cell">
              <div class="status-row">
                ${statusBadge(sslStatus)}
                ${hasSSLDetails ? `<button type="button" class="btn-icon" onclick="toggleDetails('${rowId}-ssl')" title="Show details"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/></svg></button>` : ""}
              </div>
              ${
								hasSSLDetails
									? `<div id="${rowId}-ssl" class="status-details${sslStatus === "validation_timed_out" || sslStatus === "expired" ? " error" : ""}" style="display: none;">
                <div class="status-details-item">${getSSLMessage(sslStatus, sslMethod) || `Status: ${sslStatus.replace(/_/g, " ")}`}</div>
              </div>`
									: ""
							}
            </td>
            <td>
              ${customHostname !== "-" ? `<button type="button" class="btn-icon" onclick="refreshStatus('${subdomain}')" title="Refresh status" id="refresh-${subdomain}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M240,56v48a8,8,0,0,1-8,8H184a8,8,0,0,1,0-16H211.4L184.81,71.64A81.59,81.59,0,0,0,46.37,90.32a8,8,0,1,1-14.54-6.64A97.49,97.49,0,0,1,128,32a98.33,98.33,0,0,1,69.07,28.94L224,84.07V56a8,8,0,0,1,16,0Zm-32.16,109.68a81.65,81.65,0,0,1-138.45,18.68L44.6,160H72a8,8,0,0,0,0-16H24a8,8,0,0,0-8,8v48a8,8,0,0,0,16,0V171.93l26.94,24.13A97.51,97.51,0,0,0,225.54,172.32a8,8,0,0,0-14.54-6.64Z"/></svg></button>` : "-"}
            </td>
          </tr>`;
			}

			body += `</table></div>`;
		} else {
			body += `
        <div class="banner banner-info">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z"/></svg>
          <p>No projects yet.</p>
        </div>`;
		}
	} catch (e) {
		body += `
      <div class="banner banner-info">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z"/></svg>
        <p>No projects yet. Database will auto-initialize on first project creation.</p>
      </div>`;
	}

	/*
	 * Dispatch Namespace data - show only relevant fields
	 */
	try {
		const scripts = await GetScriptsInDispatchNamespace(c.env);
		body += `<div class="success-card-label" style="margin-top: 24px;">Dispatch Namespace: ${c.env.DISPATCH_NAMESPACE_NAME}</div>`;
		if (scripts && scripts.length > 0) {
			// Filter to only show relevant fields
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const filteredScripts = scripts.map((script: any) => ({
				id: script.id,
				created_on: script.created_on,
				modified_on: script.modified_on,
			}));
			body += BuildTable("scripts", filteredScripts);
		} else {
			body += `
        <div class="banner banner-info">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z"/></svg>
          <p>No scripts deployed yet.</p>
        </div>`;
		}
	} catch (e) {
		body += `
      <div class="success-card-label" style="margin-top: 24px;">Dispatch Namespace</div>
      <div class="banner banner-warning">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8Z"/></svg>
        <p>Dispatch namespace "${c.env.DISPATCH_NAMESPACE_NAME}" was not found.</p>
      </div>`;
	}

	body += `</div>
  
  <script>
  function toggleDetails(elementId) {
    const detailsDiv = document.getElementById(elementId);
    if (detailsDiv) {
      detailsDiv.style.display = detailsDiv.style.display === 'none' ? 'block' : 'none';
    }
  }
  
  async function refreshStatus(subdomain) {
    const btn = document.getElementById('refresh-' + subdomain);
    if (btn) {
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" class="animate-spin"><path d="M232,128a104,104,0,0,1-208,0c0-41,23.81-78.36,60.66-95.27a8,8,0,0,1,6.68,14.54C60.15,61.59,40,93.27,40,128a88,88,0,0,0,176,0c0-34.73-20.15-66.41-51.34-80.73a8,8,0,0,1,6.68-14.54C208.19,49.64,232,87,232,128Z"/></svg>';
    }
    // Reload the page to refresh all statuses
    window.location.reload();
  }
  </script>`;

	return c.html(renderPage(body, { customDomain: c.env.CUSTOM_DOMAIN }));
});

/*
 * Initialize example data (now optional since auto-init handles schema)
 */
uiRoutes.get("/init", async (c) => {
	try {
		const scripts = await GetScriptsInDispatchNamespace(c.env);
		// Handle case where scripts is null/undefined (e.g., in tests or when API unavailable)
		if (scripts && Array.isArray(scripts)) {
			await Promise.all(
				scripts.map(async (script) =>
					DeleteScriptInDispatchNamespace(c.env, script.id),
				),
			);
		}
	} catch (e) {
		console.error("Failed to fetch/delete scripts in dispatch namespace:", e);
		// Continue with initialization even if the external API call fails
	}
	await Initialize(c.var.db);
	return Response.redirect(c.req.url.replace("/init", ""));
});

export default uiRoutes;
