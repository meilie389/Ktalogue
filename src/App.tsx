import { useState, useMemo, useEffect } from 'react'
import type { Filters, Credentials } from './types'
import { useSongs } from './hooks/useSongs'
import { useQueue } from './hooks/useQueue'
import { useVirtualList } from './hooks/useVirtualList'
import { Header } from './components/Header'
import { ArtistSidebar } from './components/ArtistSidebar'
import { SongCard } from './components/SongCard'
import { FavPanel } from './components/FavPanel'
import { QueuePanel } from './components/QueuePanel'
import { LoginModal } from './components/LoginModal'
import { RefreshModal } from './components/RefreshModal'
import { usePreview } from './hooks/usePreview'
import { MiniPlayer } from './components/MiniPlayer'
import { saveSession, loadSession, clearSession } from './utils/session'
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
    toggleFav, clearFavs, clearNewBadges, enrichSong, refresh, filterSongs,
  } = useSongs()

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [activeArtist, setActiveArtist] = useState<string | null>(null)
  const [favPanelOpen, setFavPanelOpen] = useState(false)
  const [queuePanelOpen, setQueuePanelOpen] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [artistDrawerOpen, setArtistDrawerOpen] = useState(false)
  const [credentials, setCredentials] = useState<Credentials | null>(() => loadSession())

  function handleAuthError() {
    setCredentials(null)
    clearSession()
    setLoginModalOpen(true)
  }

  const { queue, isInQueue, isLoadingQueue, fetchQueue, addToQueue, removeFromQueue, moveInQueue, songStatus, entryStatus } = useQueue(credentials, handleAuthError)
  const { current: previewTrack, isPlaying: previewPlaying, isLoading: previewLoading, progress, duration, playPreview, togglePlay, seek, stop: stopPreview } = usePreview(enrichSong)

  // Auto-fetch de la file à l'ouverture du panneau
  useEffect(() => {
    if (queuePanelOpen && credentials) fetchQueue(allSongs)
  }, [queuePanelOpen]) // eslint-disable-line

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

  function handleExportCatalog() {
    // Exporte tout le catalogue (base + extras + enrichissement iTunes)
    // en retirant les champs runtime uniquement présents en mémoire
    const toExport = allSongs.map((s) => {
      const { isNew, ...rest } = s
      const clean: Record<string, unknown> = { ...rest }
      delete clean._search  // champ interne ajouté par normalizeSong
      return clean
    })
    const blob = new Blob([JSON.stringify(toExport, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    const now = new Date()
    const ts = now.toISOString().slice(0, 16).replace('T', '-').replace(':', '-')
    a.download = `songs-${ts}.json`
    a.click()
  }

  function handleSelectArtist(artist: string | null) {
    setActiveArtist(artist)
    patchFilters({ query: '' })
  }

  function handleReset() {
    setFilters(DEFAULT_FILTERS)
    setActiveArtist(null)
    setFavPanelOpen(false)
  }

  async function handleLogin(email: string, password: string) {
    const creds = { email, password }
    setCredentials(creds)
    saveSession(creds)
    setLoginModalOpen(false)
  }

  function handleLogout() {
    setCredentials(null)
    clearSession()
    setRefreshStatus({ state: 'idle' })
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
        onToggleFavPanel={() => { setFavPanelOpen(v => !v); setQueuePanelOpen(false) }}
        onOpenRefresh={() => setSyncModalOpen(true)}
        onOpenLogin={() => setLoginModalOpen(true)}
        onLogout={handleLogout}
        onReset={handleReset}
        queueCount={queue.length}
        queuePanelOpen={queuePanelOpen}
        onToggleQueuePanel={() => { setQueuePanelOpen(v => !v); setFavPanelOpen(false) }}
        userEmail={credentials?.email ?? null}
        onExportCatalog={handleExportCatalog}
      />

      <button
        className={styles.artistMobileBtn}
        onClick={() => setArtistDrawerOpen(true)}
        aria-label="Choisir un artiste"
      >
        <span>🎤</span>
        <span className={styles.artistMobileBtnLabel}>{activeArtist ?? 'Tous les artistes'}</span>
        <span>▾</span>
      </button>

      <div className={styles.body}>
        <ArtistSidebar
          artists={artists}
          total={allSongs.length}
          activeArtist={activeArtist}
          onSelect={handleSelectArtist}
          drawerOpen={artistDrawerOpen}
          onDrawerClose={() => setArtistDrawerOpen(false)}
        />

        <main className={styles.catalog} style={previewTrack ? { paddingBottom: 88 } : undefined}>
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
                onAddToQueue={async (s) => {
                  if (!credentials) { setLoginModalOpen(true); return }
                  try { await addToQueue(s) } catch { /* affiché via songStatus */ }
                }}
                queueStatus={
                  isInQueue(song.id) ? 'queued'
                  : songStatus[song.id] === 'loading' ? 'loading'
                  : songStatus[song.id] === 'error' ? 'error'
                  : undefined
                }
                onPreview={playPreview}
                previewStatus={
                  previewTrack?.songId === song.id
                    ? previewLoading ? 'loading' : previewPlaying ? 'playing' : 'idle'
                    : undefined
                }
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

        {queuePanelOpen && (
          <QueuePanel
            queue={queue}
            entryStatus={entryStatus}
            hasCredentials={!!credentials}
            isLoadingQueue={isLoadingQueue}
            onReload={() => fetchQueue(allSongs)}
            onRemove={removeFromQueue}
            onMove={moveInQueue}
            onClose={() => setQueuePanelOpen(false)}
            onNeedLogin={() => { setQueuePanelOpen(false); setLoginModalOpen(true) }}
          />
        )}
      </div>

      {previewTrack && (
        <MiniPlayer
          track={previewTrack}
          isPlaying={previewPlaying}
          isLoading={previewLoading}
          progress={progress}
          duration={duration}
          onToggle={togglePlay}
          onSeek={seek}
          onClose={stopPreview}
        />
      )}

      {loginModalOpen && (
        <LoginModal
          onLogin={handleLogin}
          onClose={() => setLoginModalOpen(false)}
        />
      )}

      {syncModalOpen && credentials && (
        <RefreshModal
          status={refreshStatus}
          userEmail={credentials.email}
          onSync={() => refresh(credentials.email, credentials.password)}
          onClose={() => { setSyncModalOpen(false); setRefreshStatus({ state: 'idle' }) }}
          onClearNew={clearNewBadges}
        />
      )}
    </div>
  )
}
