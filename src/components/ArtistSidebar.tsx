import { useState, useRef, useMemo } from 'react'
import { BottomSheet } from './BottomSheet'
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
  const [search, setSearch] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  function handleSelect(artist: string | null) {
    onSelect(artist)
    onDrawerClose?.()
    setSearch('')
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return artists
    const q = search.trim().toLowerCase()
    return artists.filter(([name]) => name.toLowerCase().includes(q))
  }, [artists, search])

  // Groupement alphabétique (uniquement si pas de recherche active)
  const grouped = useMemo(() => {
    if (search.trim()) return null
    const map = new Map<string, [string, number][]>()
    for (const entry of artists) {
      const letter = entry[0][0]?.toUpperCase() ?? '#'
      const key = /[A-Z]/.test(letter) ? letter : '#'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(entry)
    }
    return map
  }, [artists, search])

  const letters = grouped ? [...grouped.keys()].sort((a, b) => a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)) : []

  function scrollToLetter(letter: string) {
    const container = listRef.current
    const el = container?.querySelector(`[data-letter="${letter}"]`) as HTMLElement | null
    if (container && el) {
      container.scrollTop = el.offsetTop
    }
  }

  const [sidebarSearch, setSidebarSearch] = useState('')
  const sidebarListRef = useRef<HTMLDivElement>(null)

  const filteredSidebar = useMemo(() => {
    if (!sidebarSearch.trim()) return artists
    const q = sidebarSearch.trim().toLowerCase()
    return artists.filter(([name]) => name.toLowerCase().includes(q))
  }, [artists, sidebarSearch])

  const groupedSidebar = useMemo(() => {
    if (sidebarSearch.trim()) return null
    const map = new Map<string, [string, number][]>()
    for (const entry of artists) {
      const letter = entry[0][0]?.toUpperCase() ?? '#'
      const key = /[A-Z]/.test(letter) ? letter : '#'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(entry)
    }
    return map
  }, [artists, sidebarSearch])

  const sidebarLetters = groupedSidebar
    ? [...groupedSidebar.keys()].sort((a, b) => a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b))
    : []

  function scrollSidebarToLetter(letter: string) {
    const container = sidebarListRef.current
    const el = container?.querySelector(`[data-letter="${letter}"]`) as HTMLElement | null
    if (container && el) {
      container.scrollTop = el.offsetTop
    }
  }

  const sidebarContent = (
    <>
      <div className={styles.sidebarSearchRow}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className={styles.sidebarSearchInput}
            type="search"
            placeholder="Artiste…"
            value={sidebarSearch}
            onChange={e => setSidebarSearch(e.target.value)}
          />
          {sidebarSearch && <button className={styles.clearBtn} onClick={() => setSidebarSearch('')}>✕</button>}
        </div>
      </div>
      <div className={styles.sidebarBody}>
        <div className={styles.list} ref={sidebarListRef}>
          <div
            className={`${styles.item} ${activeArtist === null ? styles.active : ''}`}
            onClick={() => handleSelect(null)}
          >
            <span className={styles.name}>Tous</span>
            <span className={styles.count}>{total.toLocaleString('fr')}</span>
          </div>
          {sidebarSearch.trim() ? (
            filteredSidebar.length === 0 ? (
              <div className={styles.noResults}>Aucun résultat</div>
            ) : (
              filteredSidebar.map(([name, count]) => (
                <div
                  key={name}
                  className={`${styles.item} ${activeArtist === name ? styles.active : ''}`}
                  onClick={() => handleSelect(name)}
                >
                  <span className={styles.name}>{name}</span>
                  <span className={styles.count}>{count}</span>
                </div>
              ))
            )
          ) : (
            sidebarLetters.map(letter => (
              <div key={letter} data-letter={letter}>
                <div className={styles.letterHeader}>{letter}</div>
                {groupedSidebar!.get(letter)!.map(([name, count]) => (
                  <div
                    key={name}
                    className={`${styles.item} ${activeArtist === name ? styles.active : ''}`}
                    onClick={() => handleSelect(name)}
                  >
                    <span className={styles.name}>{name}</span>
                    <span className={styles.count}>{count}</span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
        {!sidebarSearch.trim() && (
          <div className={styles.alphaIndex}>
            {sidebarLetters.map(letter => (
              <button key={letter} className={styles.alphaBtn} onClick={() => scrollSidebarToLetter(letter)}>
                {letter}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )

  const drawerContent = (
    <div className={styles.drawerInner}>
      {/* Barre de recherche */}
      <div className={styles.searchRow}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Rechercher un artiste…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          {search && <button className={styles.clearBtn} onClick={() => setSearch('')}>✕</button>}
        </div>
      </div>

      <div className={styles.drawerBody}>
        {/* Liste avec groupes alphabétiques ou résultats filtrés */}
        <div className={styles.drawerList} ref={listRef}>
          <div
            className={`${styles.item} ${activeArtist === null ? styles.active : ''}`}
            onClick={() => handleSelect(null)}
          >
            <span className={styles.name}>Tous les artistes</span>
            <span className={styles.count}>{total.toLocaleString('fr')}</span>
          </div>

          {search.trim() ? (
            // Mode recherche : liste plate
            filtered.length === 0 ? (
              <div className={styles.noResults}>Aucun artiste trouvé</div>
            ) : (
              filtered.map(([name, count]) => (
                <div
                  key={name}
                  className={`${styles.item} ${activeArtist === name ? styles.active : ''}`}
                  onClick={() => handleSelect(name)}
                >
                  <span className={styles.name}>{name}</span>
                  <span className={styles.count}>{count}</span>
                </div>
              ))
            )
          ) : (
            // Mode alphabétique : groupes avec en-tête lettre
            letters.map(letter => (
              <div key={letter} data-letter={letter}>
                <div className={styles.letterHeader}>{letter}</div>
                {grouped!.get(letter)!.map(([name, count]) => (
                  <div
                    key={name}
                    className={`${styles.item} ${activeArtist === name ? styles.active : ''}`}
                    onClick={() => handleSelect(name)}
                  >
                    <span className={styles.name}>{name}</span>
                    <span className={styles.count}>{count}</span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Index alphabétique latéral — uniquement hors recherche */}
        {!search.trim() && (
          <div className={styles.alphaIndex}>
            {letters.map(letter => (
              <button key={letter} className={styles.alphaBtn} onClick={() => scrollToLetter(letter)}>
                {letter}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Sidebar desktop */}
      <aside className={styles.sidebar}>
        <div className={styles.label}>Artistes</div>
        {sidebarContent}
      </aside>

      {/* Drawer mobile */}
      {drawerOpen && (
        <BottomSheet title="🎤 Artistes" onClose={() => { onDrawerClose?.(); setSearch('') }}>
          {drawerContent}
        </BottomSheet>
      )}
    </>
  )
}
