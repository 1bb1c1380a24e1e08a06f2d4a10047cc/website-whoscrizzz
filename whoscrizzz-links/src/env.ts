export interface Link {
  id: number;
  slug: string;
  url: string;
  title: string;
  icon: string;
  category: string;
  sort_order: number;
  active: number;
  clicks: number;
}

export interface Env {
  DB: D1Database;
  AUTH_KV: KVNamespace;
  ADMIN_PASSWORD: string;
}
