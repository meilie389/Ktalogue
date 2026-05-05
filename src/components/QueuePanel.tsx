import type { QueueEntry } from '../types'
import styles from './QueuePanel.module.css'

interface Props {
  queue: QueueEntry[]
  entryStatus: Record<number, 'idle' | 'loading' | 'error'>
  hasCredentials: boolean
  onRemove: (entry: QueueEntry) => void
  onMove: (entry: QueueEntry, direction: 'up' | 'down') => void
  onClose: () => void
  onNeedLogin: () => void
}

export function QueuePanel({ queue, entryStatus, hasCredentials, onRemove, onMove, onClose, onNeedLogin }: Props) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>🎙 File d'attente</span>
        <span className={styles.count}>{queue.length}</span>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">✕</button>
      </div>

      {!hasCredentials && (
        <div className={styles.loginPrompt}>
          <p>Connecte-toi pour gérer la file.</p>
          <button className={styles.loginBtn} onClick={onNeedLogin}>Se connecter</button>
        </div>
      )}

      {hasCredentials && queue.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🎤</div>
          <p>La file est vide</p>
        </div>
      )}

      <div className={styles.list}>
        {queue.map((entry, idx) => {
          const st = entryStatus[entry.song.id]
          const isLoading = st === 'loading'
          const isError = st === 'error'
          return (
            <div key={entry.song.id} className={`${styles.entry} ${isError ? styles.entryError : ''}`}>
              <div className={styles.pos}>{idx + 1}</div>
              <div className={styles.info}>
                <div className={styles.entryTitle}>{entry.song.title}</div>
                <div className={styles.entryArtist}>{entry.song.artist}</div>
                {entry.karaokeId === null && (
                  <div className={styles.noId}>id non disponible</div>
                )}
              </div>
              <div className={styles.actions}>
                <button
                  className={styles.moveBtn}
                  onClick={() => onMove(entry, 'up')}
                  disabled={isLoading || idx === 0 || entry.karaokeId === null}
                  title="Monter"
                >▲</button>
                <button
                  className={styles.moveBtn}
                  onClick={() => onMove(entry, 'down')}
                  disabled={isLoading || idx === queue.length - 1 || entry.karaokeId === null}
                  title="Descendre"
                >▼</button>
                <button
                  className={styles.removeBtn}
                  onClick={() => onRemove(entry)}
                  disabled={isLoading}
                  title="Retirer"
                >
                  {isLoading ? '⟳' : isError ? '✗' : '✕'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
