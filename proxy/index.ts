/**
 * Proxy Deno Deploy — Karaoké
 *
 * Endpoints :
 *   POST /login            { email, password }                        → { token, email }
 *   POST /logout           { token }                                  → { ok: true }
 *   POST /search           { token }                                  → Song[]
 *   POST /queue            { token }                                  → QueueItem[]
 *   POST /add              { token, song_id }                        → any
 *   POST /remove           { token, karaoke_id }                     → any
 *   POST /change-position  { token, karaoke_id, direction }          → any
 *   GET  /health                                                       → { ok: true }
 *
 * Sessions stockées dans Deno KV :
 *   ["sessions", token] → { email, cookies: CookieJar, createdAt: number }
 *   TTL : SESSION_TTL_MS (8 heures)
 */

const BASE_URL = "https://e-events.codewave.nc/";
const SEARCH_URL = `${BASE_URL}search`;
const LOGIN_URL = `${BASE_URL}login`;
const KARAOKE_URL = `${BASE_URL}karaoke`;

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 heures

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
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
}

function extractCsrfToken(html: string): string | null {
  const m = html.match(/name="_token"\s+value="([^"]+)"/);
  return m ? m[1] : null;
}

// ── Session store (Deno KV) ───────────────────────────────────────────────────

interface KtaloqueSession {
  email: string;
  cookies: CookieJar;
  createdAt: number;
}

const kv = await Deno.openKv();

async function saveSession(token: string, session: KtaloqueSession): Promise<void> {
  await kv.set(["sessions", token], session, { expireIn: SESSION_TTL_MS });
}

async function getSession(token: string): Promise<KtaloqueSession | null> {
  const entry = await kv.get<KtaloqueSession>(["sessions", token]);
  if (!entry.value) return null;
  if (Date.now() - entry.value.createdAt > SESSION_TTL_MS) {
    await kv.delete(["sessions", token]);
    return null;
  }
  return entry.value;
}

async function deleteSession(token: string): Promise<void> {
  await kv.delete(["sessions", token]);
}

// ── e-events login → CookieJar ────────────────────────────────────────────────

async function loginToEEvents(email: string, password: string): Promise<CookieJar> {
  let jar: CookieJar = {};

  // 1. GET homepage → CSRF + cookies initiaux
  const r1 = await fetch(BASE_URL, {
    method: "GET",
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0", "Accept": "text/html" },
  });
  if (!r1.ok) throw new Error(`GET ${BASE_URL} failed: ${r1.status}`);

  jar = mergeCookies(jar, extractCookies(r1.headers));
  const html = await r1.text();
  const csrfToken = extractCsrfToken(html);
  if (!csrfToken) throw new Error("CSRF token introuvable");

  // 2. POST /login
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
    body: new URLSearchParams({ email, password, _token: csrfToken }).toString(),
  });

  jar = mergeCookies(jar, extractCookies(r2.headers));

  // Suivre 302
  if (r2.status === 301 || r2.status === 302) {
    const location = r2.headers.get("Location") ?? BASE_URL;
    const nextUrl = location.startsWith("http")
      ? location
      : `${BASE_URL}${location.startsWith("/") ? location.slice(1) : location}`;
    const r3 = await fetch(nextUrl, {
      method: "GET",
      redirect: "follow",
      headers: { "Cookie": cookieHeader(jar), "User-Agent": "Mozilla/5.0", "Accept": "text/html" },
    });
    jar = mergeCookies(jar, extractCookies(r3.headers));
  } else if (r2.status >= 400) {
    const body = await r2.text();
    throw new Error(`POST /login failed ${r2.status}: ${body.slice(0, 300)}`);
  }

  if (!jar["laravel_session"]) {
    throw new Error("Authentification échouée : identifiants incorrects.");
  }

  return jar;
}

// ── Appel e-events avec cookies de session ────────────────────────────────────

async function callWithCookies(cookies: CookieJar, targetUrl: string): Promise<Response> {
  const isHtmlTarget = targetUrl.includes("/karaoke") && !targetUrl.includes("?");
  const r = await fetch(targetUrl, {
    method: "GET",
    redirect: "follow",
    headers: {
      "Cookie": cookieHeader(cookies),
      "Accept": isHtmlTarget ? "text/html" : "application/json",
      "User-Agent": "Mozilla/5.0",
      "X-Requested-With": "XMLHttpRequest",
      "Referer": `${BASE_URL}karaoke`,
    },
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`GET ${targetUrl} failed ${r.status}: ${body.slice(0, 300)}`);
  }
  return r;
}

// ── Helpers request ───────────────────────────────────────────────────────────

async function parseBody(req: Request): Promise<Record<string, unknown>> {
  try { return await req.json(); }
  catch { throw new Error("Body JSON invalide"); }
}

async function requireSession(body: Record<string, unknown>): Promise<KtaloqueSession> {
  const token = body.token as string;
  if (!token) throw Object.assign(new Error("Token requis"), { status: 401 });
  const session = await getSession(token);
  if (!session) throw Object.assign(new Error("Session expirée. Reconnecte-toi."), { status: 401 });
  return session;
}

function jsonOk(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status = 502): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ── Parseur de la file d'attente HTML ─────────────────────────────────────────

interface QueueItem { karaokeId: number; title: string; artist: string; }

function parseKaraokeQueue(html: string): QueueItem[] {
  const ids = [...html.matchAll(/removeSong\((\d+)\)/g)].map((m) => parseInt(m[1]));
  const texts = [...html.matchAll(/<p class="col-7 mb-1">([\s\S]*?)<\/p>/g)].map((m) => m[1].trim());
  return ids.map((karaokeId, i) => {
    const raw = texts[i] ?? "";
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    const title = (lines[0] ?? "").replace(/^#\d+\s*-\s*/, "").trim();
    const artist = (lines[1] ?? "").trim();
    return { karaokeId, title, artist };
  });
}

// ── Request handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (url.pathname === "/health") return jsonOk({ ok: true });
  if (req.method !== "POST") return new Response("Not found", { status: 404, headers: CORS_HEADERS });

  // ── POST /login ──────────────────────────────────────────────────────────────
  if (url.pathname === "/login") {
    try {
      const body = await parseBody(req);
      const email = (body.email as string)?.trim();
      const password = body.password as string;
      if (!email || !password) return jsonError("email et password requis", 400);

      const cookies = await loginToEEvents(email, password);
      const token = crypto.randomUUID();
      await saveSession(token, { email, cookies, createdAt: Date.now() });
      return jsonOk({ token, email });
    } catch (e) {
      const msg = (e as Error).message;
      console.error("Proxy /login error:", msg);
      return jsonError(msg, msg.includes("Authentification") ? 401 : 502);
    }
  }

  // ── POST /logout ─────────────────────────────────────────────────────────────
  if (url.pathname === "/logout") {
    try {
      const body = await parseBody(req);
      if (body.token) await deleteSession(body.token as string);
      return jsonOk({ ok: true });
    } catch (e) { return jsonError((e as Error).message); }
  }

  // ── POST /queue ──────────────────────────────────────────────────────────────
  if (url.pathname === "/queue") {
    try {
      const body = await parseBody(req);
      const session = await requireSession(body);
      const upstream = await callWithCookies(session.cookies, KARAOKE_URL);
      return jsonOk(parseKaraokeQueue(await upstream.text()));
    } catch (e) {
      const err = e as Error & { status?: number };
      console.error("Proxy /queue error:", err.message);
      return jsonError(err.message, err.status ?? 502);
    }
  }

  // ── POST /search ─────────────────────────────────────────────────────────────
  if (url.pathname === "/search") {
    try {
      const body = await parseBody(req);
      const session = await requireSession(body);
      const upstream = await callWithCookies(session.cookies, SEARCH_URL);
      const data = await upstream.json();
      return jsonOk(Array.isArray(data) ? data : (data.data ?? data.items ?? []));
    } catch (e) {
      const err = e as Error & { status?: number };
      console.error("Proxy /search error:", err.message);
      return jsonError(err.message, err.status ?? 502);
    }
  }

  // ── POST /add ────────────────────────────────────────────────────────────────
  if (url.pathname === "/add") {
    try {
      const body = await parseBody(req);
      const session = await requireSession(body);
      if (!body.song_id) return jsonError("song_id requis", 400);
      const upstream = await callWithCookies(session.cookies, `${BASE_URL}add?song_id=${body.song_id}`);
      return jsonOk(await upstream.json());
    } catch (e) {
      const err = e as Error & { status?: number };
      console.error("Proxy /add error:", err.message);
      return jsonError(err.message, err.status ?? 502);
    }
  }

  // ── POST /remove ─────────────────────────────────────────────────────────────
  if (url.pathname === "/remove") {
    try {
      const body = await parseBody(req);
      const session = await requireSession(body);
      if (!body.karaoke_id) return jsonError("karaoke_id requis", 400);
      const upstream = await callWithCookies(session.cookies, `${BASE_URL}remove?karaoke_id=${body.karaoke_id}`);
      return jsonOk(await upstream.json());
    } catch (e) {
      const err = e as Error & { status?: number };
      console.error("Proxy /remove error:", err.message);
      return jsonError(err.message, err.status ?? 502);
    }
  }

  // ── POST /change-position ────────────────────────────────────────────────────
  if (url.pathname === "/change-position") {
    try {
      const body = await parseBody(req);
      const session = await requireSession(body);
      if (!body.karaoke_id) return jsonError("karaoke_id requis", 400);
      if (body.direction !== "up" && body.direction !== "down") return jsonError("direction doit être 'up' ou 'down'", 400);
      const upstream = await callWithCookies(
        session.cookies,
        `${BASE_URL}change-position?karaoke_id=${body.karaoke_id}&direction=${body.direction}`,
      );
      return jsonOk(await upstream.json());
    } catch (e) {
      const err = e as Error & { status?: number };
      console.error("Proxy /change-position error:", err.message);
      return jsonError(err.message, err.status ?? 502);
    }
  }

  return new Response("Not found", { status: 404, headers: CORS_HEADERS });
});
