// Declare the test environment type for cloudflare:test
// This allows the `env` export from "cloudflare:test" to be properly typed
// with the actual Worker bindings defined in Env.
import type { Env } from "./src/env";

declare module "cloudflare:test" {
	interface ProvidedEnv extends Env {}
}
