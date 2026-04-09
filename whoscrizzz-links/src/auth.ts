export function randomToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isAuthenticated(request: Request, kv: KVNamespace): Promise<boolean> {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/wzSession=([a-f0-9]{64})/);
  if (!match) return false;
  const val = await kv.get(`session:${match[1]}`);
  return val === "valid";
}

export function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/wzSession=([a-f0-9]{64})/);
  return match ? match[1] : null;
}
