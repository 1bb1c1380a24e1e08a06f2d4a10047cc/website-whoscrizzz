import { isAuthenticated } from "./auth";
import { json } from "./helpers";
import type { Env } from "./env";

export async function handleApiList(request: Request, env: Env): Promise<Response> {
  if (!await isAuthenticated(request, env.AUTH_KV))
    return json({ error: "Unauthorized" }, 401);
  const { results } = await env.DB.prepare(
    "SELECT * FROM links ORDER BY sort_order ASC"
  ).all();
  return json(results ?? []);
}

export async function handleApiCreate(request: Request, env: Env): Promise<Response> {
  if (!await isAuthenticated(request, env.AUTH_KV))
    return json({ error: "Unauthorized" }, 401);
  const body = await request.json<Record<string, unknown>>();
  if (!body.slug || !body.url || !body.title)
    return json({ error: "slug, url y title son requeridos" }, 400);
  try {
    await env.DB.prepare(
      "INSERT INTO links (slug,url,title,icon,category,sort_order) VALUES (?,?,?,?,?,?)"
    )
      .bind(
        (body.slug as string).toLowerCase().replace(/[^a-z0-9_-]/g, ""),
        body.url,
        body.title,
        body.icon ?? "link",
        body.category ?? "social",
        body.sort_order ?? 99
      )
      .run();
    return json({ ok: true });
  } catch (e: unknown) {
    return json({ error: (e as Error).message ?? "Error al crear" }, 409);
  }
}

export async function handleApiUpdate(request: Request, env: Env, id: number): Promise<Response> {
  if (!await isAuthenticated(request, env.AUTH_KV))
    return json({ error: "Unauthorized" }, 401);
  const body = await request.json<Record<string, unknown>>();
  await env.DB.prepare(
    "UPDATE links SET slug=COALESCE(?,slug), url=COALESCE(?,url), title=COALESCE(?,title), icon=COALESCE(?,icon), sort_order=COALESCE(?,sort_order), active=COALESCE(?,active) WHERE id=?"
  )
    .bind(
      body.slug ?? null,
      body.url ?? null,
      body.title ?? null,
      body.icon ?? null,
      body.sort_order ?? null,
      body.active ?? null,
      id
    )
    .run();
  return json({ ok: true });
}

export async function handleApiDelete(request: Request, env: Env, id: number): Promise<Response> {
  if (!await isAuthenticated(request, env.AUTH_KV))
    return json({ error: "Unauthorized" }, 401);
  await env.DB.prepare("DELETE FROM links WHERE id=?").bind(id).run();
  return json({ ok: true });
}
