import type { Song } from '../types'
import { normalizeLang } from '../utils/normalize'
import styles from './SongCard.module.css'

interface Props {
  song: Song & { isNew?: boolean }
  isFav: boolean
  onToggleFav: (id: number) => void
}

export function SongCard({ song, isFav, onToggleFav }: Props) {
  const lang = normalizeLang(song.album)
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
      <button
        className={`${styles.favBtn} ${isFav ? styles.favActive : ''}`}
        onClick={() => onToggleFav(song.id)}
        title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      >
        {isFav ? '♥' : '♡'}
      </button>
    </div>
  )
}
