import { useState } from 'react'
import type { Song, QueueEntry, Session } from '../types'
import { BottomSheet } from './BottomSheet'
import { Spinner } from './Spinner'
import { PROXY_URL, proxyHeaders } from '../hooks/useSongs'
import styles from './InfoPanel.module.css'
import cardStyles from './SongCard.module.css'

type AuthTab = 'nouveautes' | 'favoris' | 'file' | 'demande'

interface Props {
  session: Session | null
  onClose: () => void
  onAuthError: () => void
  onOpenLogin: () => void
  nouveautes: Song[]
  favSongs: Song[]
  onToggleFav: (id: number) => void
  queue: QueueEntry[]
  entryStatus: Record<number, 'idle' | 'loading' | 'error'>
  isLoadingQueue: boolean
  onReloadQueue: () => void
  isInQueue: (id: number) => boolean
  onAddToQueue: (song: Song) => void
  onRemoveFromQueue: (entry: QueueEntry) => void
  onMoveInQueue: (entry: QueueEntry, dir: 'up' | 'down') => void
  songStatus: Record<number, 'loading' | 'error' | 'idle'>
  onPreview: (song: Song) => void
  previewSongId?: number
  previewStatus?: 'loading' | 'playing' | 'idle'
}

const REGLEMENT_KARAOKE = [
  "Merci de vous connecter via Internet ou 4G.",
  "Les inscriptions sont obligatoires via le QR CODE ou le lien : e-events.codewave.nc",
  "Voir Auguste ou Valérie pour + d'information.",
  "Merci de bien vouloir patienter et attendre votre tour.",
  "Merci de respecter l'ordre de passage — pas de favoritisme.",
  "Pas de passe-droit même pour nos stars habituées.",
]

function SongRow({
  song, isFav, inQueue, queueLoading, isPreviewSong, previewStatus,
  onToggleFav, onAddToQueue, onPreview,
}: {
  song: Song; isFav: boolean; inQueue: boolean; queueLoading: boolean
  isPreviewSong: boolean; previewStatus?: 'loading' | 'playing' | 'idle'
  onToggleFav: () => void; onAddToQueue: () => void; onPreview: () => void
}) {
  return (
    <div className={styles.songRow}>
      <div className={styles.songInfo}>
        <div className={styles.songTitle}>{song.title}</div>
        <div className={styles.songArtist}>{song.artist}</div>
      </div>
      <div className={styles.songActions}>
        <button
          className={`${cardStyles.previewBtn} ${isPreviewSong && previewStatus === 'playing' ? cardStyles.previewBtnPlaying : ''}`}
          onClick={onPreview}
          title="Écouter l'extrait"
          disabled={isPreviewSong && previewStatus === 'loading'}
        >
          {isPreviewSong && previewStatus === 'loading' ? <Spinner size={10} /> :
           isPreviewSong && previewStatus === 'playing' ? '⏸' : '▶'}
        </button>
        <button
          className={`${cardStyles.queueBtn} ${inQueue ? cardStyles.queueBtnQueued : ''}`}
          onClick={onAddToQueue}
          disabled={inQueue || queueLoading}
          title={inQueue ? 'Déjà dans la file' : 'Ajouter à la file'}
        >
          {queueLoading ? <Spinner size={10} /> : inQueue ? '✓' : '+'}
        </button>
        <button
          className={`${cardStyles.favBtn} ${isFav ? cardStyles.favBtnActive : ''}`}
          onClick={onToggleFav}
          title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          {isFav ? '♥' : '♡'}
        </button>
      </div>
    </div>
  )
}

export function InfoPanel({
  session, onClose, onAuthError, onOpenLogin,
  nouveautes, favSongs, onToggleFav,
  queue, entryStatus, isLoadingQueue, onReloadQueue,
  isInQueue, onAddToQueue, onRemoveFromQueue, onMoveInQueue,
  songStatus, onPreview, previewSongId, previewStatus,
}: Props) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640
  const [authTab, setAuthTab] = useState<AuthTab>('nouveautes')
  const [requestValue, setRequestValue] = useState('')
  const [requestState, setRequestState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [requestError, setRequestError] = useState('')

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

  /* ── Vue non connectée ── */
  const publicContent = (
    <div className={styles.publicView}>
      <div className={styles.heroCard}>
        <div className={styles.heroLogo}>🎤</div>
        <div className={styles.heroTitle}>Soirée E PROD NC</div>
        <p className={styles.heroSub}>Karaoké live, blind test, animations musicales en Nouvelle-Calédonie</p>
        <a href="https://www.eprodnc.com/" target="_blank" rel="noopener noreferrer" className={styles.heroLink}>
          Découvrir eprodnc.com →
        </a>
      </div>

      <div className={styles.infoSection}>
        <div className={styles.infoSectionHeader}>
          <span className={styles.infoSectionEmoji}>🎤</span>
          <h3 className={styles.infoSectionTitle}>Karaoké Live</h3>
        </div>
        <p className={styles.infoSectionIntro}>Pour le bon déroulement de nos soirées Karaoké…</p>
        <ol className={styles.reglementList}>
          {REGLEMENT_KARAOKE.map((r, i) => <li key={i}>{r}</li>)}
        </ol>
        <a href="https://www.eprodnc.com/soireekaraokelive" target="_blank" rel="noopener noreferrer" className={styles.moreLink}>
          En savoir plus sur le Karaoké Live →
        </a>
      </div>

      <div className={styles.infoSection}>
        <div className={styles.infoSectionHeader}>
          <span className={styles.infoSectionEmoji}>🎵</span>
          <h3 className={styles.infoSectionTitle}>Quizz Musical — Blind Test</h3>
        </div>
        <p className={styles.blindTestText}>
          Les équipes s'apprêtent à s'affronter dans une série de battles de Blind-Test où chacun devra mettre en avant sa culture musicale pour gagner un maximum de points. Attention, il faudra se montrer réactif pour remporter la mise ! Une épreuve explosive dont le duo Auguste et Kevin est à l'origine.
        </p>
        <p className={styles.blindTestText}>
          Plusieurs séries de Blind-Test thématisés sont proposées au choix des opposants parmi un éventail de registres très variés. Les titres ont été minutieusement sélectionnés pour offrir une véritable anthologie musicale qui transportera le public dans un tourbillon de chansons que chacun reprendra en chœur.
        </p>
        <p className={styles.blindTestText}>
          L'animation Blind-Test est particulièrement interactive et facile d'accès, garantissant la participation du plus grand nombre. Partenaire de vos événements d'entreprise, la société E EVENTS NC anime vos séminaires, dîners de gala, cocktails, plénières et team building avec des activités conviviales et fédératrices. Ludique et festif, le blind-test se prête à de nombreuses occasions.
        </p>
        <p className={styles.blindTestContact}>
          📞 Infoline : <strong>79 70 84</strong> ou <strong>73 09 30</strong> — Auguste &amp; Kevin
        </p>
        <a href="https://www.eprodnc.com/quizzteampro" target="_blank" rel="noopener noreferrer" className={styles.moreLink}>
          En savoir plus sur le Quizz Team Pro →
        </a>
      </div>

      <div className={styles.loginCard}>
        <div className={styles.loginCardIcon}>🔑</div>
        <p className={styles.loginCardText}>
          Connecte-toi pour accéder au catalogue complet, gérer ta liste de favoris et ajouter des chansons à la file d'attente.
        </p>
        <button className={styles.loginCardBtn} onClick={onOpenLogin}>
          Se connecter
        </button>
        <p className={styles.loginCardHint}>
          Utilise tes identifiants e-events.codewave.nc
        </p>
      </div>
    </div>
  )

  /* ── Vue connectée ── */
  const AUTH_TABS: { key: AuthTab; label: string }[] = [
    { key: 'nouveautes', label: '✨ Nouveautés' },
    { key: 'favoris', label: '♥ Favoris' },
    { key: 'file', label: '🎙 File' },
    { key: 'demande', label: '📝 Demande' },
  ]

  const authContent = (
    <div className={styles.authView}>
      <div className={styles.authTabs}>
        {AUTH_TABS.map(t => (
          <button
            key={t.key}
            className={`${styles.authTab} ${authTab === t.key ? styles.authTabActive : ''}`}
            onClick={() => setAuthTab(t.key)}
          >
            {t.label}
            {t.key === 'nouveautes' && nouveautes.length > 0 && <span className={styles.tabBadge}>{nouveautes.length}</span>}
            {t.key === 'favoris' && favSongs.length > 0 && <span className={styles.tabBadge}>{favSongs.length}</span>}
            {t.key === 'file' && queue.length > 0 && <span className={styles.tabBadge}>{queue.length}</span>}
          </button>
        ))}
      </div>

      <div className={styles.authTabContent}>
        {authTab === 'nouveautes' && (
          nouveautes.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>✨</div>
              <p>Aucune nouveauté depuis la dernière synchro</p>
            </div>
          ) : (
            <div className={styles.songList}>
              {nouveautes.map(s => (
                <SongRow key={s.id} song={s}
                  isFav={favSongs.some(f => f.id === s.id)}
                  inQueue={isInQueue(s.id)}
                  queueLoading={songStatus[s.id] === 'loading'}
                  isPreviewSong={previewSongId === s.id}
                  previewStatus={previewSongId === s.id ? previewStatus : undefined}
                  onToggleFav={() => onToggleFav(s.id)}
                  onAddToQueue={() => onAddToQueue(s)}
                  onPreview={() => onPreview(s)}
                />
              ))}
            </div>
          )
        )}

        {authTab === 'favoris' && (
          favSongs.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>♡</div>
              <p>Clique sur ♡ pour ajouter des chansons à ta liste</p>
            </div>
          ) : (
            <div className={styles.songList}>
              {favSongs.map(s => (
                <SongRow key={s.id} song={s}
                  isFav={true}
                  inQueue={isInQueue(s.id)}
                  queueLoading={songStatus[s.id] === 'loading'}
                  isPreviewSong={previewSongId === s.id}
                  previewStatus={previewSongId === s.id ? previewStatus : undefined}
                  onToggleFav={() => onToggleFav(s.id)}
                  onAddToQueue={() => onAddToQueue(s)}
                  onPreview={() => onPreview(s)}
                />
              ))}
            </div>
          )
        )}

        {authTab === 'file' && (
          <>
            <div className={styles.fileHeader}>
              <span className={styles.fileTitle}>{queue.length} chanson{queue.length > 1 ? 's' : ''} en attente</span>
              <button
                className={`${styles.reloadBtn} ${isLoadingQueue ? styles.reloading : ''}`}
                onClick={onReloadQueue}
                disabled={isLoadingQueue}
                title="Recharger"
              >
                {isLoadingQueue ? <Spinner size={12} /> : '⟳'}
              </button>
            </div>
            {queue.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🎙</div>
                <p>La file est vide</p>
              </div>
            ) : (
              <div className={styles.queueList}>
                {queue.map((entry, i) => {
                  const st = entryStatus[entry.karaokeId ?? -1]
                  return (
                    <div key={entry.karaokeId ?? i} className={styles.queueEntry}>
                      <div className={styles.queuePos}>{i + 1}</div>
                      <div className={styles.queueInfo}>
                        <div className={styles.songTitle}>{entry.song.title}</div>
                        <div className={styles.songArtist}>{entry.song.artist}</div>
                      </div>
                      <div className={styles.queueActions}>
                        <button className={styles.moveBtn} onClick={() => onMoveInQueue(entry, 'up')} disabled={i === 0 || st === 'loading'} title="Remonter">▲</button>
                        <button className={styles.moveBtn} onClick={() => onMoveInQueue(entry, 'down')} disabled={i === queue.length - 1 || st === 'loading'} title="Descendre">▼</button>
                        <button className={styles.removeBtn} onClick={() => onRemoveFromQueue(entry)} disabled={st === 'loading'} title="Retirer">
                          {st === 'loading' ? <Spinner size={10} /> : '✕'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {authTab === 'demande' && (
          <div className={styles.demandeView}>
            <p className={styles.demandeInfo}>
              Tu ne trouves pas ta chanson dans le catalogue ? Envoie une demande à l'animateur pour qu'il puisse l'ajouter lors d'une prochaine soirée.
            </p>
            <textarea
              className={styles.requestInput}
              placeholder="Ex: Stromae – Alors on danse"
              value={requestValue}
              onChange={e => setRequestValue(e.target.value)}
              rows={3}
              disabled={requestState === 'loading' || requestState === 'success'}
            />
            {requestState === 'error' && <p className={styles.requestError}>❌ {requestError}</p>}
            {requestState === 'success' && <p className={styles.requestSuccess}>✅ Demande envoyée !</p>}
            <button
              className={styles.sendBtn}
              onClick={handleSendRequest}
              disabled={!requestValue.trim() || requestState === 'loading' || requestState === 'success'}
            >
              {requestState === 'loading' ? <Spinner size={14} /> : '📩 Envoyer la demande'}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const content = session ? authContent : publicContent
  const title = session ? `ℹ️ Infos — ${session.email.split('@')[0]}` : 'ℹ️ Infos soirée'

  if (isMobile) {
    return <BottomSheet title={title} onClose={onClose}>{content}</BottomSheet>
  }

  return (
    <aside className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>{title}</span>
        <button className={styles.closeBtn} onClick={onClose} title="Fermer">✕</button>
      </div>
      <div className={styles.panelBody}>{content}</div>
    </aside>
  )
}
