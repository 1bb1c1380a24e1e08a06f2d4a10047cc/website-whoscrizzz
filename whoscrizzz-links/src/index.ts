import { isAuthenticated, getSessionToken, randomToken } from "./auth";
import { html, json, redirect } from "./helpers";
import { renderLanding } from "./templates/landing";
import { renderLogin } from "./templates/login";
import { renderAdmin } from "./templates/admin";
import { handleApiList, handleApiCreate, handleApiUpdate, handleApiDelete } from "./api";
import type { Env, Link } from "./env";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (path === "/" && method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM links WHERE active=1 ORDER BY sort_order ASC"
      ).all<Link>();
      return html(renderLanding(results ?? []));
    }

    if (path === "/admin/login" && method === "GET") {
      return html(renderLogin());
    }

    if (path === "/admin/login" && method === "POST") {
      const form = await request.formData();
      const pw = form.get("password")?.toString() ?? "";
      if (pw !== env.ADMIN_PASSWORD) {
        return html(renderLogin("Contraseña incorrecta."), 401);
      }
      const token = randomToken();
      await env.AUTH_KV.put(`session:${token}`, "valid", { expirationTtl: 86400 });
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/admin",
          "Set-Cookie": `wzSession=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`,
        },
      });
    }

    if (path === "/admin/logout") {
      const sessionToken = getSessionToken(request);
      if (sessionToken) await env.AUTH_KV.delete(`session:${sessionToken}`);
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/admin/login",
          "Set-Cookie": "wzSession=; Path=/; HttpOnly; Secure; Max-Age=0",
        },
      });
    }

    if (path === "/admin" && method === "GET") {
      if (!await isAuthenticated(request, env.AUTH_KV)) {
        return redirect("/admin/login");
      }
      const { results } = await env.DB.prepare(
        "SELECT * FROM links ORDER BY sort_order ASC"
      ).all<Link>();
      return html(renderAdmin(results ?? []));
    }

    if (path === "/api/links" && method === "GET") {
      return handleApiList(request, env);
    }

    if (path === "/api/links" && method === "POST") {
      return handleApiCreate(request, env);
    }

    const editMatch = path.match(/^\/api\/links\/(\d+)$/);
    if (editMatch && method === "PUT") {
      return handleApiUpdate(request, env, parseInt(editMatch[1]));
    }
    if (editMatch && method === "DELETE") {
      return handleApiDelete(request, env, parseInt(editMatch[1]));
    }

    const slug = path.slice(1);
    if (slug && !slug.includes("/") && method === "GET") {
      const link = await env.DB.prepare(
        "SELECT * FROM links WHERE slug=? AND active=1"
      ).bind(slug).first<Link>();
      if (link) {
        ctx.waitUntil(
          env.DB.prepare("UPDATE links SET clicks=clicks+1 WHERE id=?").bind(link.id).run()
        );
        return redirect(link.url, 302);
      }
    }

    return new Response("Not found", { status: 404 });
  },
};
