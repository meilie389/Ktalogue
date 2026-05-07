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
 *   POST /songrequest      { token, value }                          → { ok: true }
 *   POST /myrequests       { token }                                  → { requests: RequestEntry[] }
 *   POST /top              { token }                                  → TopEntry[]
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

// ── Requests store (Deno KV) ──────────────────────────────────────────────────

interface RequestEntry {
  value: string;
  createdAt: number;
}

const REQUESTS_MAX = 50; // max demandes gardées par user

async function saveRequest(email: string, value: string): Promise<void> {
  const entry: RequestEntry = { value, createdAt: Date.now() };
  // Utilise le timestamp comme clé → tri chronologique naturel
  await kv.set(["requests", email, entry.createdAt], entry);
}

async function getUserRequests(email: string): Promise<RequestEntry[]> {
  const entries: RequestEntry[] = [];
  const iter = kv.list<RequestEntry>({ prefix: ["requests", email] }, { limit: REQUESTS_MAX });
  for await (const item of iter) {
    if (item.value) entries.push(item.value);
  }
  // Plus récent en premier
  return entries.sort((a, b) => b.createdAt - a.createdAt);
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
    redirect: "manual",          // on gère les redirections manuellement
    headers: {
      "Cookie": cookieHeader(cookies),
      "Accept": isHtmlTarget ? "text/html" : "application/json",
      "User-Agent": "Mozilla/5.0",
      "X-Requested-With": "XMLHttpRequest",
      "Referer": `${BASE_URL}karaoke`,
    },
  });

  // 302 → e-events redirige vers la page de login : session expirée côté e-events
  if (r.status === 301 || r.status === 302) {
    const err = Object.assign(
      new Error("Session expirée. Reconnecte-toi."),
      { status: 401 }
    );
    throw err;
  }

  if (!r.ok) {
    const body = await r.text();
    const isAuthFailure = r.status === 401 || r.status === 403 ||
      body.toLowerCase().includes("login") || body.toLowerCase().includes("unauthenticated");
    const err = Object.assign(
      new Error(isAuthFailure
        ? "Session expirée. Reconnecte-toi."
        : `GET ${targetUrl} failed ${r.status}: ${body.slice(0, 300)}`),
      { status: isAuthFailure ? 401 : r.status }
    );
    throw err;
  }
  return r;
}

// ── Helpers request ───────────────────────────────────────────────────────────

async function parseBody(req: Request): Promise<Record<string, unknown>> {
  try { return await req.json(); }
  catch { throw new Error("Body JSON invalide"); }
}

async function requireSession(body: Record<string, unknown>): Promise<KtaloqueSession & { token: string }> {
  const token = body.token as string;
  if (!token) throw Object.assign(new Error("Token requis"), { status: 401 });
  const session = await getSession(token);
  if (!session) throw Object.assign(new Error("Session expirée. Reconnecte-toi."), { status: 401 });
  return { ...session, token };
}

// ── Exécute un appel e-events, supprime la session KV si les cookies sont périmés ──
async function callOrExpire(token: string, session: KtaloqueSession, targetUrl: string): Promise<Response> {
  try {
    return await callWithCookies(session.cookies, targetUrl);
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) {
      // Cookies e-events périmés → on purge la session KV pour forcer re-login
      await deleteSession(token);
    }
    throw e;
  }
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

// ── Parseur du top musique HTML ───────────────────────────────────────────────

interface TopEntry { rank: number; title: string; artist: string; }

function parseTopMusique(html: string): TopEntry[] {
  // Cherche les patterns du top : numéros de rang + titres dans la page karaoke
  // Structure probable : liste ordonnée ou éléments avec rang
  const results: TopEntry[] = [];

  // Essaie plusieurs patterns selon la structure HTML e-events
  // Pattern 1 : <li ...>...<strong>Titre</strong>...<span>Artiste</span>...</li>
  const liMatches = [...html.matchAll(/<li[^>]*class="[^"]*top[^"]*"[^>]*>([\s\S]*?)<\/li>/gi)];
  if (liMatches.length > 0) {
    liMatches.slice(0, 5).forEach((m, i) => {
      const inner = m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const parts = inner.split(/[-–]/).map(s => s.trim()).filter(Boolean);
      results.push({ rank: i + 1, title: parts[0] ?? "—", artist: parts[1] ?? "" });
    });
    return results;
  }

  // Pattern 2 : entrées numérotées dans la queue avec rang ≤ 5
  const queue = parseKaraokeQueue(html).slice(0, 5);
  return queue.map((e, i) => ({ rank: i + 1, title: e.title, artist: e.artist }));
}

// ── Extraction CSRF token depuis la page karaoke ─────────────────────────────
// (extractCsrfToken est déjà définie plus haut pour le login)
// On réutilise la même fonction.

// ── Request handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (url.pathname === "/health") return jsonOk({ ok: true });

  // ── GET /sessions (debug) ─────────────────────────────────────────────────
  if (req.method === "GET" && url.pathname === "/sessions") {
    const secret = Deno.env.get("DEBUG_SECRET");
    if (!secret || url.searchParams.get("secret") !== secret) {
      return new Response("Forbidden", { status: 403, headers: CORS_HEADERS });
    }
    const sessions: Record<string, unknown>[] = [];
    const iter = kv.list<KtaloqueSession>({ prefix: ["sessions"] });
    for await (const entry of iter) {
      sessions.push({
        token: entry.key[1],
        email: entry.value.email,
        createdAt: new Date(entry.value.createdAt).toISOString(),
      });
    }
    return jsonOk({ count: sessions.length, sessions });
  }

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
      const upstream = await callOrExpire(session.token, session, KARAOKE_URL);
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
      const upstream = await callOrExpire(session.token, session, SEARCH_URL);
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
      const upstream = await callOrExpire(session.token, session, `${BASE_URL}add?song_id=${body.song_id}`);
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
      const upstream = await callOrExpire(session.token, session, `${BASE_URL}remove?karaoke_id=${body.karaoke_id}`);
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
      const upstream = await callOrExpire(
        session.token, session,
        `${BASE_URL}change-position?karaoke_id=${body.karaoke_id}&direction=${body.direction}`,
      );
      return jsonOk(await upstream.json());
    } catch (e) {
      const err = e as Error & { status?: number };
      console.error("Proxy /change-position error:", err.message);
      return jsonError(err.message, err.status ?? 502);
    }
  }

  // ── POST /songrequest ────────────────────────────────────────────────────────
  if (url.pathname === "/songrequest") {
    try {
      const body = await parseBody(req);
      const session = await requireSession(body);
      if (!body.value || typeof body.value !== "string" || !body.value.trim()) {
        return jsonError("value requis", 400);
      }

      // 1. Récupère un CSRF token frais depuis la page karaoke
      const pageRes = await fetch(KARAOKE_URL, {
        method: "GET",
        redirect: "manual",
        headers: {
          "Cookie": cookieHeader(session.cookies),
          "Accept": "text/html",
          "User-Agent": "Mozilla/5.0",
          "Referer": BASE_URL,
        },
      });
      if (pageRes.status === 301 || pageRes.status === 302) {
        await deleteSession(session.token);
        return jsonError("Session expirée. Reconnecte-toi.", 401);
      }
      const pageHtml = await pageRes.text();
      const csrfToken = extractCsrfToken(pageHtml);
      if (!csrfToken) return jsonError("CSRF token introuvable", 502);

      // 2. POST /songrequest
      const formData = new URLSearchParams({ _token: csrfToken, value: body.value.trim() });
      const srRes = await fetch(`${BASE_URL}songrequest`, {
        method: "POST",
        redirect: "manual",
        headers: {
          "Cookie": cookieHeader(session.cookies),
          "Content-Type": "application/x-www-form-urlencoded",
          "Origin": BASE_URL.replace(/\/$/, ""),
          "Referer": KARAOKE_URL,
          "User-Agent": "Mozilla/5.0",
          "Accept": "text/html,application/xhtml+xml",
        },
        body: formData.toString(),
      });

      // 302 = succès (Laravel redirige après POST)
      if (srRes.status === 302 || srRes.status === 200) {
        // Persiste la demande en KV pour l'historique utilisateur
        await saveRequest(session.email, body.value.trim());
        return jsonOk({ ok: true });
      }
      return jsonError(`Erreur ${srRes.status}`, 502);
    } catch (e) {
      const err = e as Error & { status?: number };
      console.error("Proxy /songrequest error:", err.message);
      return jsonError(err.message, err.status ?? 502);
    }
  }

  // ── POST /myrequests ─────────────────────────────────────────────────────────
  if (url.pathname === "/myrequests") {
    try {
      const body = await parseBody(req);
      const session = await requireSession(body);
      const requests = await getUserRequests(session.email);
      return jsonOk({ requests });
    } catch (e) {
      const err = e as Error & { status?: number };
      console.error("Proxy /myrequests error:", err.message);
      return jsonError(err.message, err.status ?? 502);
    }
  }

  // ── POST /top ─────────────────────────────────────────────────────────────
  if (url.pathname === "/top") {
    try {
      const body = await parseBody(req);
      const session = await requireSession(body);
      const upstream = await callOrExpire(session.token, session, KARAOKE_URL);
      const html = await upstream.text();
      return jsonOk(parseTopMusique(html));
    } catch (e) {
      const err = e as Error & { status?: number };
      console.error("Proxy /top error:", err.message);
      return jsonError(err.message, err.status ?? 502);
    }
  }

  return new Response("Not found", { status: 404, headers: CORS_HEADERS });
});
