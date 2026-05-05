import type { PreviewTrack } from '../hooks/usePreview'
import styles from './MiniPlayer.module.css'

interface Props {
  track: PreviewTrack
  isPlaying: boolean
  isLoading: boolean
  progress: number   // 0–1
  duration: number   // secondes
  onToggle: () => void
  onSeek: (ratio: number) => void
  onClose: () => void
}

function fmt(sec: number) {
  const s = Math.floor(sec)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function MiniPlayer({ track, isPlaying, isLoading, progress, duration, onToggle, onSeek, onClose }: Props) {
  return (
    <div className={styles.player}>
      {track.artworkUrl
        ? <img className={styles.artwork} src={track.artworkUrl} alt="" />
        : <div className={styles.artworkPlaceholder}>🎵</div>
      }

      <div className={styles.info}>
        <div className={styles.trackTitle}>{track.title}</div>
        <div className={styles.trackArtist}>{track.artist}</div>

        <div className={styles.progressRow}>
          <span className={styles.time}>{fmt(progress * duration)}</span>
          <input
            className={styles.progressBar}
            type="range"
            min={0} max={1} step={0.001}
            value={progress}
            onChange={e => onSeek(parseFloat(e.target.value))}
          />
          <span className={styles.time}>{fmt(duration)}</span>
        </div>
      </div>

      <div className={styles.controls}>
        <button
          className={`${styles.playBtn} ${isLoading ? styles.loading : ''}`}
          onClick={onToggle}
          disabled={isLoading}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading ? '⟳' : isPlaying ? '⏸' : '▶'}
        </button>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer le lecteur">✕</button>
      </div>
    </div>
  )
}
