import { useState } from 'react'
import type { Song } from '../types'
import { BottomSheet } from './BottomSheet'
import styles from './FavPanel.module.css'

interface Props {
  favSongs: Song[]
  onRemove: (id: number) => void
  onClear: () => void
  onExport: () => void
  onClose: () => void
}

export function FavPanel({ favSongs, onRemove, onClear, onExport, onClose }: Props) {
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

  const title = <>♥ Ma sélection <span className={styles.count}>{favSongs.length}</span></>

  const content = (
    <>
      <div className={styles.list}>
        {favSongs.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>♡</div>
            <p>Clique sur le ♡ d'une chanson pour l'ajouter ici</p>
          </div>
        ) : (
          sorted.map(s => (
            <div key={s.id} className={styles.item}>
              <div className={styles.itemInfo}>
                <div className={styles.itemTitle}>{s.title || '—'}</div>
                <div className={styles.itemArtist}>{s.artist || '—'}</div>
              </div>
              {s.duo && <span className={styles.duoBadge}>duo</span>}
              <button
                className={styles.removeBtn}
                onClick={() => onRemove(s.id)}
                aria-label="Retirer"
              >✕</button>
            </div>
          ))
        )}
      </div>
      <div className={styles.actions}>
        <button className={styles.btnGhost} onClick={onClear} disabled={favSongs.length === 0}>
          Effacer
        </button>
        <button className={styles.btnPrimary} onClick={onExport} disabled={favSongs.length === 0}>
          ⬇ Export JSON
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
          <span className={styles.title}>Ma sélection</span>
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
