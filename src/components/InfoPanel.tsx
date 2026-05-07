import { useState, useEffect } from 'react'
import type { Song, Session } from '../types'
import { BottomSheet } from './BottomSheet'
import { Spinner } from './Spinner'
import { PROXY_URL, proxyHeaders } from '../hooks/useSongs'
import styles from './InfoPanel.module.css'
import cardStyles from './SongCard.module.css'

type AuthTab = 'top5' | 'reglement'

interface Props {
  session: Session | null
  onClose: () => void
  onAuthError: () => void
  onOpenLogin: () => void
  favSongs: Song[]
  onToggleFav: (id: number) => void
  isInQueue: (id: number) => boolean
  onAddToQueue: (song: Song) => void
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
  favSongs, onToggleFav,
  isInQueue, onAddToQueue,
  songStatus, onPreview, previewSongId, previewStatus,
}: Props) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640
  const [authTab, setAuthTab] = useState<AuthTab>('top5')
  const [top5, setTop5] = useState<Song[]>([])
  const [top5Loading, setTop5Loading] = useState(false)

  useEffect(() => {
    if (!session || authTab !== 'top5') return
    setTop5Loading(true)
    fetch(`${PROXY_URL}/top`, {
      method: 'POST',
      headers: proxyHeaders,
      body: JSON.stringify({ token: session.token }),
    })
      .then(r => {
        if (r.status === 401) { onAuthError(); return null }
        return r.json()
      })
      .then(data => {
        if (data) setTop5(data.songs ?? data ?? [])
      })
      .catch(() => {})
      .finally(() => setTop5Loading(false))
  }, [session, authTab]) // eslint-disable-line

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
          L'animation Blind-Test est particulièrement interactive et facile d'accès, garantissant la participation du plus grand nombre. Partenaire de vos événements d'entreprise, la société E EVENTS NC anime vos séminaires, dîners de gala, cocktails, plénières et team building avec des activités conviviales et fédératrices.
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

  /* ── Vue connectée : 2 onglets ── */
  const AUTH_TABS: { key: AuthTab; label: string }[] = [
    { key: 'top5', label: '🏆 Top 5' },
    { key: 'reglement', label: '� Règlement' },
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
          </button>
        ))}
      </div>

      <div className={styles.authTabContent}>
        {authTab === 'top5' && (
          top5Loading ? (
            <div className={styles.emptyState}><Spinner size={20} /></div>
          ) : top5.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🏆</div>
              <p>Aucune donnée disponible</p>
            </div>
          ) : (
            <div className={styles.songList}>
              {top5.map((s, i) => (
                <div key={s.id} className={styles.top5Row}>
                  <span className={styles.top5Rank}>#{i + 1}</span>
                  <SongRow
                    song={s}
                    isFav={favSongs.some(f => f.id === s.id)}
                    inQueue={isInQueue(s.id)}
                    queueLoading={songStatus[s.id] === 'loading'}
                    isPreviewSong={previewSongId === s.id}
                    previewStatus={previewSongId === s.id ? previewStatus : undefined}
                    onToggleFav={() => onToggleFav(s.id)}
                    onAddToQueue={() => onAddToQueue(s)}
                    onPreview={() => onPreview(s)}
                  />
                </div>
              ))}
            </div>
          )
        )}

        {authTab === 'reglement' && (
          <div className={styles.reglementView}>
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
                <h3 className={styles.infoSectionTitle}>Quizz Musical</h3>
              </div>
              <p className={styles.blindTestContact}>
                📞 Infoline : <strong>79 70 84</strong> ou <strong>73 09 30</strong> — Auguste &amp; Kevin
              </p>
              <a href="https://www.eprodnc.com/quizzteampro" target="_blank" rel="noopener noreferrer" className={styles.moreLink}>
                En savoir plus sur le Quizz Team Pro →
              </a>
            </div>
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
