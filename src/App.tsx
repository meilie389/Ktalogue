import { useState, useMemo } from 'react'
import type { Filters } from './types'
import { useSongs } from './hooks/useSongs'
import { useVirtualList } from './hooks/useVirtualList'
import { Header } from './components/Header'
import { ArtistSidebar } from './components/ArtistSidebar'
import { SongCard } from './components/SongCard'
import { FavPanel } from './components/FavPanel'
import { RefreshModal } from './components/RefreshModal'
import styles from './App.module.css'

const DEFAULT_FILTERS: Filters = {
  query: '',
  lang: '',
  duo: false,
  favOnly: false,
  newOnly: false,
}

export default function App() {
  const {
    allSongs, favIds, langs, artists, totalNew,
    refreshStatus, setRefreshStatus,
    toggleFav, clearFavs, clearNewBadges, refresh, filterSongs,
  } = useSongs()

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [activeArtist, setActiveArtist] = useState<string | null>(null)
  const [favPanelOpen, setFavPanelOpen] = useState(false)
  const [refreshModalOpen, setRefreshModalOpen] = useState(false)

  function patchFilters(patch: Partial<Filters>) {
    setFilters(prev => ({ ...prev, ...patch }))
  }

  const filtered = useMemo(
    () => filterSongs(filters, activeArtist),
    [allSongs, filters, activeArtist, favIds, totalNew] // eslint-disable-line
  )

  const { visible, sentinelRef } = useVirtualList(filtered)

  const favSongs = useMemo(
    () => allSongs.filter(s => favIds.has(s.id)),
    [allSongs, favIds]
  )

  function handleExportFavs() {
    if (favSongs.length === 0) return
    const blob = new Blob([JSON.stringify(favSongs, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'mes-favoris-karaoke.json'
    a.click()
  }

  function handleSelectArtist(artist: string | null) {
    setActiveArtist(artist)
    patchFilters({ query: '' })
  }

  return (
    <div className={styles.root}>
      <Header
        total={allSongs.length}
        filtered={filtered.length}
        totalNew={totalNew}
        favCount={favIds.size}
        filters={filters}
        langs={langs}
        favPanelOpen={favPanelOpen}
        onFiltersChange={patchFilters}
        onToggleFavPanel={() => setFavPanelOpen(v => !v)}
        onOpenRefresh={() => setRefreshModalOpen(true)}
      />

      <div className={styles.body}>
        <ArtistSidebar
          artists={artists}
          total={allSongs.length}
          activeArtist={activeArtist}
          onSelect={handleSelectArtist}
        />

        <main className={styles.catalog}>
          <div className={styles.resultsInfo}>
            <b>{filtered.length.toLocaleString('fr')}</b>
            {' '}titre{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}
          </div>

          <div className={styles.grid}>
            {visible.map(song => (
              <SongCard
                key={song.id}
                song={song}
                isFav={favIds.has(song.id)}
                onToggleFav={toggleFav}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>🎤</div>
              <p>Aucune chanson trouvée</p>
              <button
                className={styles.resetBtn}
                onClick={() => { setFilters(DEFAULT_FILTERS); setActiveArtist(null) }}
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}

          <div ref={sentinelRef} style={{ height: 1 }} />
        </main>

        {favPanelOpen && (
          <FavPanel
            favSongs={favSongs}
            onRemove={toggleFav}
            onClear={clearFavs}
            onExport={handleExportFavs}
            onClose={() => setFavPanelOpen(false)}
          />
        )}
      </div>

      {refreshModalOpen && (
        <RefreshModal
          status={refreshStatus}
          onRefresh={refresh}
          onClose={() => {
            setRefreshModalOpen(false)
            setRefreshStatus({ state: 'idle' })
          }}
          onClearNew={clearNewBadges}
        />
      )}
    </div>
  )
}
