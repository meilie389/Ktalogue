const SESSION_KEY = 'kara_session'
const EMAIL_KEY = 'kara_email'

export interface StoredCredentials {
  email: string
  password: string
}

export function saveSession(credentials: StoredCredentials) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(credentials))
  localStorage.setItem(EMAIL_KEY, credentials.email) // email only persisted for pre-fill
}

export function loadSession(): StoredCredentials | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.email && parsed?.password) return parsed
    return null
  } catch { return null }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
}

export function getSavedEmail(): string {
  return localStorage.getItem(EMAIL_KEY) ?? ''
}
