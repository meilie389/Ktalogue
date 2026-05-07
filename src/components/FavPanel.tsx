import { useState } from 'react'
import type { Song } from '../types'
import { BottomSheet } from './BottomSheet'
import { Spinner } from './Spinner'
import styles from './FavPanel.module.css'
import cardStyles from './SongCard.module.css'

interface Props {
  favSongs: Song[]
  onRemove: (id: number) => void
  onClear: () => void
  onExport?: () => void
  onClose: () => void
  onAddToQueue?: (song: Song) => void
  onPreview?: (song: Song) => void
  isInQueue?: (songId: number) => boolean
  songStatus?: Record<number, 'loading' | 'error' | 'idle'>
  previewSongId?: number
  previewStatus?: 'loading' | 'playing' | 'idle'
}

export function FavPanel({ favSongs, onRemove, onClear, onClose, onAddToQueue, onPreview, isInQueue, songStatus, previewSongId, previewStatus }: Props) {
  const [sortBy, setSortBy] = useState<'artist' | 'title' | 'added'>('artist')
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640

  const sorted = [...favSongs].sort((a, b) => {
    if (sortBy === 'artist') return (a.artist || '').localeCompare(b.artist || '', 'fr')
    if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '', 'fr')
    return b.id - a.id
  })

  const headerActions = (
    <div className={styles.sortRow}>
      {(['artist', 'title', 'added'] as const).map(k => (
        <button
          key={k}
          className={`${styles.sortBtn} ${sortBy === k ? styles.sortActive : ''}`}
          onClick={() => setSortBy(k)}
        >
          {k === 'artist' ? 'Artiste' : k === 'title' ? 'Titre' : 'Récent'}
        </button>
      ))}
    </div>
  )

  const title = <>♥ Favoris <span className={styles.count}>{favSongs.length}</span></>

  const content = (
    <>
      <div className={styles.list}>
        {favSongs.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>♡</div>
            <p>Clique sur le ♡ d'une chanson pour l'ajouter ici</p>
          </div>
        ) : (
          sorted.map(s => {
            const queued = isInQueue?.(s.id)
            const qSt = songStatus?.[s.id]
            const isLoadingQ = qSt === 'loading'
            const isErrorQ = qSt === 'error'
            const isCurrent = previewSongId === s.id
            const pSt = isCurrent ? previewStatus : undefined
            return (
              <div key={s.id} className={`${styles.item} ${isCurrent && pSt === 'playing' ? styles.itemPlaying : ''}`}>
                <div className={styles.itemInfo}>
                  <div className={styles.itemTitle}>{s.title || '—'}</div>
                  <div className={styles.itemArtist}>{s.artist || '—'}</div>
                </div>
                {s.duo && <span className={styles.duoBadge}>duo</span>}
                <div className={styles.itemActions}>
                  {onPreview && (
                    <button
                      className={[
                        cardStyles.previewBtn,
                        pSt === 'playing' ? cardStyles.previewBtnPlaying : '',
                        pSt === 'loading' ? cardStyles.previewBtnLoading : '',
                        !s.itunesId && pSt !== 'playing' && pSt !== 'loading' ? cardStyles.previewBtnUnenriched : '',
                      ].join(' ')}
                      onClick={() => onPreview(s)}
                      title={pSt === 'playing' ? 'Pause' : 'Écouter un extrait'}
                    >
                      {pSt === 'loading' ? <Spinner size={9} /> : pSt === 'playing' ? '⏸' : '▶'}
                    </button>
                  )}
                  {onAddToQueue && (
                    <button
                      className={`${cardStyles.queueBtn} ${queued ? cardStyles.queueBtnQueued : ''} ${isErrorQ ? cardStyles.queueBtnError : ''}`}
                      onClick={() => !queued && !isLoadingQ && onAddToQueue(s)}
                      disabled={isLoadingQ || queued}
                      title={queued ? 'Dans la file' : isErrorQ ? 'Erreur' : 'Ajouter à la file'}
                    >
                      {isLoadingQ ? <Spinner size={9} /> : isErrorQ ? '✗' : queued ? '✓' : '+'}
                    </button>
                  )}
                  <button
                    className={styles.removeBtn}
                    onClick={() => onRemove(s.id)}
                    aria-label="Retirer des favoris"
                  >♥</button>
                </div>
              </div>
            )
          })
        )}
      </div>
      <div className={styles.actions}>
        <button className={styles.btnGhost} onClick={onClear} disabled={favSongs.length === 0}>
          Effacer
        </button>
      </div>
    </>
  )

  if (isMobile) {
    return (
      <BottomSheet title={title} onClose={onClose} headerActions={headerActions}>
        {content}
      </BottomSheet>
    )
  }

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.title}>Favoris</span>
          <span className={styles.count}>{favSongs.length}</span>
          <div className={styles.sortRow}>
            {(['artist', 'title', 'added'] as const).map(k => (
              <button
                key={k}
                className={`${styles.sortBtn} ${sortBy === k ? styles.sortActive : ''}`}
                onClick={() => setSortBy(k)}
              >
                {k === 'artist' ? 'Artiste' : k === 'title' ? 'Titre' : 'Récent'}
              </button>
            ))}
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">✕</button>
        </div>
      </div>
      {content}
    </aside>
  )
}
