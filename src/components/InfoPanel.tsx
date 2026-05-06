import { useState, useEffect } from 'react'
import type { Session } from '../types'
import { BottomSheet } from './BottomSheet'
import { Spinner } from './Spinner'
import { PROXY_URL, proxyHeaders } from '../hooks/useSongs'
import styles from './InfoPanel.module.css'

interface TopEntry { rank: number; title: string; artist: string }

interface Props {
  session: Session | null
  onClose: () => void
  onAuthError: () => void
}

const REGLEMENT = [
  'Merci de vous connecter via Internet ou 4G.',
  'Les inscriptions sont obligatoires via le QR CODE ou le lien : e-events.codewave.nc',
  'Voir Auguste ou Valérie pour + d\'information.',
  'Merci de bien vouloir patienter et attendre votre tour.',
  'Merci de respecter l\'ordre de passage — pas de favoritisme.',
  'Pas de passe-droit même pour nos stars habituées.',
]

export function InfoPanel({ session, onClose, onAuthError }: Props) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640
  const [tab, setTab] = useState<'top' | 'reglement'>('top')
  const [top, setTop] = useState<TopEntry[]>([])
  const [topLoading, setTopLoading] = useState(false)
  const [requestValue, setRequestValue] = useState('')
  const [requestState, setRequestState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [requestError, setRequestError] = useState('')

  // Charge le top à l'ouverture si connecté
  useEffect(() => {
    if (!session) return
    setTopLoading(true)
    fetch(`${PROXY_URL}/top`, {
      method: 'POST',
      headers: proxyHeaders,
      body: JSON.stringify({ token: session.token }),
    })
      .then(r => {
        if (r.status === 401) { onAuthError(); return }
        return r.json()
      })
      .then(data => { if (data) setTop(data) })
      .catch(() => {})
      .finally(() => setTopLoading(false))
  }, [session]) // eslint-disable-line

  async function handleSendRequest() {
    if (!session || !requestValue.trim()) return
    setRequestState('loading')
    setRequestError('')
    try {
      const res = await fetch(`${PROXY_URL}/songrequest`, {
        method: 'POST',
        headers: proxyHeaders,
        body: JSON.stringify({ token: session.token, value: requestValue.trim() }),
      })
      if (res.status === 401) { onAuthError(); return }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Erreur ${res.status}` }))
        throw new Error(err.error ?? `Erreur ${res.status}`)
      }
      setRequestState('success')
      setRequestValue('')
      setTimeout(() => setRequestState('idle'), 4000)
    } catch (e) {
      setRequestState('error')
      setRequestError((e as Error).message)
    }
  }

  const content = (
    <>
      {/* ── Top / Règlement ── */}
      <div className={styles.section}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'top' ? styles.tabActive : ''}`}
            onClick={() => setTab('top')}
          >🏆 Top 5</button>
          <button
            className={`${styles.tab} ${tab === 'reglement' ? styles.tabActive : ''}`}
            onClick={() => setTab('reglement')}
          >📋 Règlement</button>
        </div>

        {tab === 'top' && (
          topLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
              <Spinner size={18} />
            </div>
          ) : top.length === 0 ? (
            <p className={styles.topEmpty}>
              {session ? 'Aucune donnée disponible' : 'Connecte-toi pour voir le top'}
            </p>
          ) : (
            <div className={styles.topList}>
              {top.map(e => (
                <div key={e.rank} className={styles.topEntry}>
                  <div className={styles.topRank}>#{e.rank}</div>
                  <div className={styles.topInfo}>
                    <div className={styles.topTitle}>{e.title}</div>
                    {e.artist && <div className={styles.topArtist}>{e.artist}</div>}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'reglement' && (
          <div className={styles.reglementText}>
            <p>Pour le bon déroulement de nos soirées Karaoké…</p>
            <ol>
              {REGLEMENT.map((r, i) => <li key={i}>{r}</li>)}
            </ol>
            <p style={{ marginTop: 10, fontStyle: 'italic' }}>
              Très belle soirée à tous ! ☎ 797.084 / 730.930
            </p>
          </div>
        )}
      </div>

      {/* ── Demande de morceau ── */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>🎵 Demander un morceau</div>
        <p className={styles.requestDesc} style={{ marginTop: 8 }}>
          Vous ne trouvez pas votre morceau ? Envoyez-nous le lien ou le titre et nous l'ajouterons !
        </p>
        <textarea
          className={styles.requestField}
          placeholder="Ex: UPSAHL - Money On My Mind ou lien YouTube…"
          value={requestValue}
          onChange={e => { setRequestValue(e.target.value); setRequestState('idle') }}
          disabled={requestState === 'loading' || !session}
          maxLength={500}
        />
        <div className={styles.requestActions}>
          <button
            className={styles.requestBtn}
            onClick={handleSendRequest}
            disabled={!session || !requestValue.trim() || requestState === 'loading'}
          >
            {requestState === 'loading' ? <Spinner size={13} /> : 'Envoyer'}
          </button>
          {requestState === 'success' && (
            <span className={styles.requestSuccess}>✓ Demande envoyée !</span>
          )}
          {requestState === 'error' && (
            <span className={styles.requestError}>{requestError || 'Erreur'}</span>
          )}
          {!session && (
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Connexion requise</span>
          )}
        </div>
      </div>
    </>
  )

  if (isMobile) {
    return (
      <BottomSheet title="ℹ️ Infos soirée" onClose={onClose}>
        {content}
      </BottomSheet>
    )
  }

  return (
    <aside className={styles.panel}>
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>ℹ️ Infos soirée</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
      </div>
      {content}
    </aside>
  )
}
