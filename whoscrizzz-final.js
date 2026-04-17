/**
 * whoscrizzz-final.js
 *
 * Minimal fallback/default Worker used as the root Worker for the
 * whoscrizzz platform. It simply returns a 200 OK response and is
 * deployed to the main dispatch namespace as the catch-all origin
 * when no user Worker matches the incoming request.
 *
 * This file is a legacy Service Worker (addEventListener API) rather
 * than the ES-module format used by the rest of the codebase; it is
 * intentionally kept simple so it can be deployed to older runtimes.
 */
addEventListener("fetch", (evento) => {
  evento.respondWith(new Response("OK"));
});
