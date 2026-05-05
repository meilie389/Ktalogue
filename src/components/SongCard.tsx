import type { Song } from '../types'
import { normalizeLang } from '../utils/normalize'
import styles from './SongCard.module.css'

interface Props {
  song: Song & { isNew?: boolean }
  isFav: boolean
  onToggleFav: (id: number) => void
  queueStatus?: 'loading' | 'error' | 'queued'
  onAddToQueue?: (song: Song) => void
  previewStatus?: 'loading' | 'playing' | 'idle'
  onPreview?: (song: Song) => void
}

export function SongCard({ song, isFav, onToggleFav, queueStatus, onAddToQueue, previewStatus, onPreview }: Props) {
  const lang = normalizeLang(song.album)
  const isQueued = queueStatus === 'queued'
  const isLoading = queueStatus === 'loading'
  const isError = queueStatus === 'error'

  const durationLabel = song.durationMs
    ? `${Math.floor(song.durationMs / 60000)}:${String(Math.floor((song.durationMs % 60000) / 1000)).padStart(2, '0')}`
    : null

  return (
    <div className={`${styles.card} ${isFav ? styles.isFav : ''} ${song.isNew ? styles.isNew : ''} ${previewStatus === 'playing' ? styles.isPlaying : ''}`}>
      <div className={styles.info}>
        <div className={styles.title}>{song.title || '—'}</div>
        <div className={styles.artist}>{song.artist || '—'}</div>
        <div className={styles.badges}>
          <span className={styles.badgeLang}>{lang}</span>
          {song.duo && <span className={styles.badgeDuo}>duo</span>}
          {song.isNew && <span className={styles.badgeNew}>new</span>}
          {durationLabel && <span className={styles.badgeDuration}>{durationLabel}</span>}
          {song.genre && <span className={styles.badgeGenre}>{song.genre}</span>}
        </div>
      </div>
      <div className={styles.cardActions}>
        {onPreview && (
          <button
            className={[
              styles.previewBtn,
              previewStatus === 'playing' ? styles.previewBtnPlaying : '',
              previewStatus === 'loading' ? styles.previewBtnLoading : '',
              !song.itunesId && previewStatus !== 'playing' && previewStatus !== 'loading'
                ? styles.previewBtnUnenriched
                : '',
            ].join(' ')}
            onClick={() => onPreview(song)}
            title={previewStatus === 'playing' ? 'Pause' : 'Écouter un extrait'}
            aria-label="Extrait"
          >
            {previewStatus === 'loading' ? '⟳' : previewStatus === 'playing' ? '⏸' : '▶'}
          </button>
        )}
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
