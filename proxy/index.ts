/**
 * Proxy Deno Deploy — Karaoké
 * Déployé sur https://dash.deno.com/
 *
 * Variables d'environnement à configurer sur Deno Deploy :
 *   (aucune — les credentials arrivent dans le body de la requête,
 *    chiffrés en transit via HTTPS)
 *
 * Endpoints :
 *   POST /search          { email, password }                          → Song[]
 *   POST /add             { email, password, song_id }                 → any
 *   POST /remove          { email, password, karaoke_id }              → any
 *   POST /change-position { email, password, karaoke_id, direction }   → any
 *   GET  /health                                                        → { ok: true }
 */

const BASE_URL = "https://e-events.codewave.nc/";
const SEARCH_URL = `${BASE_URL}search`;
const LOGIN_URL = `${BASE_URL}login`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ── Cookie helpers ────────────────────────────────────────────────────────────

type CookieJar = Record<string, string>;

function extractCookies(headers: Headers): CookieJar {
  const jar: CookieJar = {};
  const cookies = headers.getSetCookie?.() ?? [];
  for (const line of cookies) {
    const nv = line.split(";")[0];
    const i = nv.indexOf("=");
    if (i > 0) jar[nv.slice(0, i).trim()] = nv.slice(i + 1).trim();
  }
  return jar;
}

function mergeCookies(a: CookieJar, b: CookieJar): CookieJar {
  return { ...a, ...b };
}

function cookieHeader(jar: CookieJar): string {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function extractCsrfToken(html: string): string | null {
  const m = html.match(/name="_token"\s+value="([^"]+)"/);
  return m ? m[1] : null;
}

// ── Auth + fetch ──────────────────────────────────────────────────────────────

/**
 * Se connecte avec email/password puis appelle targetUrl (GET).
 * Retourne la Response brute de l'appel cible.
 */
async function loginAndCall(
  email: string,
  password: string,
  targetUrl: string,
): Promise<Response> {
  let jar: CookieJar = {};

  // 1. GET homepage → CSRF token + initial cookies
  const r1 = await fetch(BASE_URL, {
    method: "GET",
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "text/html",
    },
  });

  if (!r1.ok) {
    throw new Error(`GET ${BASE_URL} failed: ${r1.status}`);
  }

  jar = mergeCookies(jar, extractCookies(r1.headers));
  const html = await r1.text();
  const csrfToken = extractCsrfToken(html);

  if (!csrfToken) {
    throw new Error("CSRF token introuvable dans le HTML de la page d'accueil");
  }

  // 2. POST /login
  const formData = new URLSearchParams({
    email,
    password,
    _token: csrfToken,
  });

  const r2 = await fetch(LOGIN_URL, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": cookieHeader(jar),
      "Origin": BASE_URL,
      "Referer": BASE_URL,
      "User-Agent": "Mozilla/5.0",
      "Accept": "text/html",
    },
    body: formData.toString(),
  });

  jar = mergeCookies(jar, extractCookies(r2.headers));

  // Follow redirect if needed
  if (r2.status === 301 || r2.status === 302) {
    const location = r2.headers.get("Location") ?? BASE_URL;
    const nextUrl = location.startsWith("http")
      ? location
      : `${BASE_URL}${location.startsWith("/") ? location.slice(1) : location}`;

    const r3 = await fetch(nextUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "Cookie": cookieHeader(jar),
        "User-Agent": "Mozilla/5.0",
        "Accept": "text/html",
      },
    });
    jar = mergeCookies(jar, extractCookies(r3.headers));
  } else if (!r2.ok && r2.status >= 400) {
    const body = await r2.text();
    throw new Error(`POST /login failed ${r2.status}: ${body.slice(0, 300)}`);
  }

  if (!jar["laravel_session"]) {
    throw new Error(
      "Authentification échouée : cookie laravel_session absent. Vérifie tes identifiants.",
    );
  }

  // 3. Call target URL
  const r4 = await fetch(targetUrl, {
    method: "GET",
    redirect: "follow",
    headers: {
      "Cookie": cookieHeader(jar),
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0",
      "X-Requested-With": "XMLHttpRequest",
      "Referer": `${BASE_URL}karaoke`,
    },
  });

  if (!r4.ok) {
    const body = await r4.text();
    throw new Error(`GET ${targetUrl} failed ${r4.status}: ${body.slice(0, 300)}`);
  }

  return r4;
}

// ── Helpers pour parser le body d'une requête POST ────────────────────────────

async function parseBody(req: Request): Promise<Record<string, unknown>> {
  try {
    return await req.json();
  } catch {
    throw new Error("Body JSON invalide");
  }
}

function requireCredentials(body: Record<string, unknown>): { email: string; password: string } {
  const email = (body.email as string)?.trim();
  const password = body.password as string;
  if (!email || !password) throw new Error("email et password requis");
  return { email, password };
}

// ── Request handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Health check
  if (url.pathname === "/health") {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response("Not found", { status: 404, headers: CORS_HEADERS });
  }

  // ── POST /search ────────────────────────────────────────────────────────────
  if (url.pathname === "/search") {
    try {
      const body = await parseBody(req);
      const { email, password } = requireCredentials(body);
      const upstream = await loginAndCall(email, password, SEARCH_URL);
      const data = await upstream.json();
      const songs = Array.isArray(data) ? data : (data.data ?? data.items ?? []);
      return new Response(JSON.stringify(songs), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("Proxy /search error:", e);
      return new Response(
        JSON.stringify({ error: (e as Error).message }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }
  }

  // ── POST /add ───────────────────────────────────────────────────────────────
  if (url.pathname === "/add") {
    try {
      const body = await parseBody(req);
      const { email, password } = requireCredentials(body);
      const songId = body.song_id;
      if (!songId) throw new Error("song_id requis");
      const targetUrl = `${BASE_URL}add?song_id=${songId}`;
      const upstream = await loginAndCall(email, password, targetUrl);
      const data = await upstream.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("Proxy /add error:", e);
      return new Response(
        JSON.stringify({ error: (e as Error).message }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }
  }

  // ── POST /remove ────────────────────────────────────────────────────────────
  if (url.pathname === "/remove") {
    try {
      const body = await parseBody(req);
      const { email, password } = requireCredentials(body);
      const karaokeId = body.karaoke_id;
      if (!karaokeId) throw new Error("karaoke_id requis");
      const targetUrl = `${BASE_URL}remove?karaoke_id=${karaokeId}`;
      const upstream = await loginAndCall(email, password, targetUrl);
      const data = await upstream.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("Proxy /remove error:", e);
      return new Response(
        JSON.stringify({ error: (e as Error).message }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }
  }

  // ── POST /change-position ───────────────────────────────────────────────────
  if (url.pathname === "/change-position") {
    try {
      const body = await parseBody(req);
      const { email, password } = requireCredentials(body);
      const karaokeId = body.karaoke_id;
      const direction = body.direction;
      if (!karaokeId) throw new Error("karaoke_id requis");
      if (direction !== "up" && direction !== "down") throw new Error("direction doit être 'up' ou 'down'");
      const targetUrl = `${BASE_URL}change-position?karaoke_id=${karaokeId}&direction=${direction}`;
      const upstream = await loginAndCall(email, password, targetUrl);
      const data = await upstream.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("Proxy /change-position error:", e);
      return new Response(
        JSON.stringify({ error: (e as Error).message }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }
  }

  return new Response("Not found", { status: 404, headers: CORS_HEADERS });
});
