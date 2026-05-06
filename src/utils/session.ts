const SESSION_KEY = 'kara_session_v2'
const EMAIL_KEY = 'kara_email'

export interface StoredSession {
  token: string
  email: string
}

export function saveSession(session: StoredSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  localStorage.setItem(EMAIL_KEY, session.email)
}

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.token && parsed?.email) return parsed
    return null
  } catch { return null }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function getSavedEmail(): string {
  return localStorage.getItem(EMAIL_KEY) ?? ''
}
