/**
 * Proxy Deno Deploy — Karaoké
 * Déployé sur https://dash.deno.com/
 *
 * Variables d'environnement à configurer sur Deno Deploy :
 *   (aucune — les credentials arrivent dans le body de la requête,
 *    chiffrés en transit via HTTPS)
 *
 * Endpoints :
 *   POST /search  { email, password }  → Song[]
 *   GET  /health                        → { ok: true }
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
  // Deno flattens Set-Cookie into one header separated by commas in some versions,
  // but getSetCookie() is the reliable API
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

async function loginAndFetch(
  email: string,
  password: string,
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
    redirect: "manual", // handle 302 ourselves to capture cookies
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

  // 3. GET /search
  const r4 = await fetch(SEARCH_URL, {
    method: "GET",
    redirect: "follow",
    headers: {
      "Cookie": cookieHeader(jar),
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (!r4.ok) {
    const body = await r4.text();
    throw new Error(`GET /search failed ${r4.status}: ${body.slice(0, 300)}`);
  }

  return r4;
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

  // POST /search
  if (url.pathname === "/search" && req.method === "POST") {
    let email: string, password: string;

    try {
      const body = await req.json();
      email = body.email?.trim();
      password = body.password;
      if (!email || !password) throw new Error("email et password requis");
    } catch (e) {
      return new Response(
        JSON.stringify({ error: (e as Error).message }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    try {
      const upstream = await loginAndFetch(email, password);
      const data = await upstream.json();

      // Normalise: accept array, .data, or .items
      const songs = Array.isArray(data)
        ? data
        : (data.data ?? data.items ?? []);

      return new Response(JSON.stringify(songs), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("Proxy error:", e);
      return new Response(
        JSON.stringify({ error: (e as Error).message }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }
  }

  return new Response("Not found", { status: 404, headers: CORS_HEADERS });
});
