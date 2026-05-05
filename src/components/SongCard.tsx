import type { Song } from '../types'
import { normalizeLang } from '../utils/normalize'
import styles from './SongCard.module.css'

interface Props {
  song: Song & { isNew?: boolean }
  isFav: boolean
  onToggleFav: (id: number) => void
  queueStatus?: 'loading' | 'error' | 'queued'
  onAddToQueue?: (song: Song) => void
}

export function SongCard({ song, isFav, onToggleFav, queueStatus, onAddToQueue }: Props) {
  const lang = normalizeLang(song.album)
  const isQueued = queueStatus === 'queued'
  const isLoading = queueStatus === 'loading'
  const isError = queueStatus === 'error'

  return (
    <div className={`${styles.card} ${isFav ? styles.isFav : ''} ${song.isNew ? styles.isNew : ''}`}>
      <div className={styles.info}>
        <div className={styles.title}>{song.title || '—'}</div>
        <div className={styles.artist}>{song.artist || '—'}</div>
        <div className={styles.badges}>
          <span className={styles.badgeLang}>{lang}</span>
          {song.duo && <span className={styles.badgeDuo}>duo</span>}
          {song.isNew && <span className={styles.badgeNew}>new</span>}
        </div>
      </div>
      <div className={styles.cardActions}>
        {onAddToQueue && (
          <button
            className={`${styles.queueBtn} ${isQueued ? styles.queueBtnQueued : ''} ${isError ? styles.queueBtnError : ''}`}
            onClick={() => !isQueued && !isLoading && onAddToQueue(song)}
            disabled={isLoading || isQueued}
            title={isQueued ? 'Dans la file' : isError ? 'Erreur, réessaie' : 'Ajouter à la file'}
            aria-label="Ajouter à la file"
          >
            {isLoading ? '⟳' : isError ? '✗' : isQueued ? '✓' : '+'}
          </button>
        )}
        <button
          className={`${styles.favBtn} ${isFav ? styles.favActive : ''}`}
          onClick={() => onToggleFav(song.id)}
          title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          {isFav ? '♥' : '♡'}
        </button>
      </div>
    </div>
  )
}
