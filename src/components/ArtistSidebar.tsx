import styles from './ArtistSidebar.module.css'

interface Props {
  artists: [string, number][]
  total: number
  activeArtist: string | null
  onSelect: (artist: string | null) => void
}

export function ArtistSidebar({ artists, total, activeArtist, onSelect }: Props) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.label}>Artistes</div>

      <div
        className={`${styles.item} ${activeArtist === null ? styles.active : ''}`}
        onClick={() => onSelect(null)}
      >
        <span className={styles.name}>Tous</span>
        <span className={styles.count}>{total.toLocaleString('fr')}</span>
      </div>

      {artists.map(([name, count]) => (
        <div
          key={name}
          className={`${styles.item} ${activeArtist === name ? styles.active : ''}`}
          onClick={() => onSelect(name)}
        >
          <span className={styles.name}>{name}</span>
          <span className={styles.count}>{count}</span>
        </div>
      ))}
    </aside>
  )
}
