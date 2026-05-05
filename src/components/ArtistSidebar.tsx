import styles from './ArtistSidebar.module.css'

interface Props {
  artists: [string, number][]
  total: number
  activeArtist: string | null
  onSelect: (artist: string | null) => void
  drawerOpen?: boolean
  onDrawerClose?: () => void
}

export function ArtistSidebar({ artists, total, activeArtist, onSelect, drawerOpen = false, onDrawerClose }: Props) {
  function handleSelect(artist: string | null) {
    onSelect(artist)
    onDrawerClose?.()
  }

  const artistList = (
    <>
      <div
        className={`${styles.item} ${activeArtist === null ? styles.active : ''}`}
        onClick={() => handleSelect(null)}
      >
        <span className={styles.name}>Tous</span>
        <span className={styles.count}>{total.toLocaleString('fr')}</span>
      </div>

      {artists.map(([name, count]) => (
        <div
          key={name}
          className={`${styles.item} ${activeArtist === name ? styles.active : ''}`}
          onClick={() => handleSelect(name)}
        >
          <span className={styles.name}>{name}</span>
          <span className={styles.count}>{count}</span>
        </div>
      ))}
    </>
  )

  return (
    <>
      {/* Sidebar desktop */}
      <aside className={styles.sidebar}>
        <div className={styles.label}>Artistes</div>
        {artistList}
      </aside>

      {/* Drawer mobile */}
      {drawerOpen && (
        <div className={styles.overlay} onClick={onDrawerClose}>
          <div className={styles.drawer} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <span className={styles.drawerTitle}>Artistes</span>
              <button
                className={styles.drawerClose}
                onClick={onDrawerClose}
                aria-label="Fermer"
              >✕</button>
            </div>
            <div className={styles.drawerList}>
              {artistList}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
