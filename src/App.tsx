import { useState, useMemo, useEffect } from 'react'
import type { Filters, Session } from './types'
import { useSongs, PROXY_URL } from './hooks/useSongs'
import { useQueue } from './hooks/useQueue'
import { useVirtualList } from './hooks/useVirtualList'
import { useTheme } from './hooks/useTheme'
import { Header } from './components/Header'
import { ArtistSidebar } from './components/ArtistSidebar'
import { SongCard } from './components/SongCard'
import { FavPanel } from './components/FavPanel'
import { QueuePanel } from './components/QueuePanel'
import { LoginModal } from './components/LoginModal'
import { RefreshModal } from './components/RefreshModal'
import { InfoPanel } from './components/InfoPanel'
import { HomeScreen } from './components/HomeScreen'
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
  const { theme, toggleTheme } = useTheme()
  const {
    allSongs, favIds, langs, artists, totalNew,
    refreshStatus, setRefreshStatus,
    toggleFav, clearFavs, clearNewBadges, enrichSong, refresh, filterSongs,
  } = useSongs()

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [activeArtist, setActiveArtist] = useState<string | null>(null)
  const [favPanelOpen, setFavPanelOpen] = useState(false)
  const [queuePanelOpen, setQueuePanelOpen] = useState(false)
  const [infoPanelOpen, setInfoPanelOpen] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [artistDrawerOpen, setArtistDrawerOpen] = useState(false)
  const [credentials, setCredentials] = useState<Session | null>(() => loadSession())

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

  const nouveautes = useMemo(
    () => allSongs.filter(s => s.isNew),
    [allSongs]
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
    const res = await fetch(`${PROXY_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
      throw new Error(err.error ?? `HTTP ${res.status}`)
    }
    const { token, email: returnedEmail } = await res.json()
    const session: Session = { token, email: returnedEmail }
    setCredentials(session)
    saveSession(session)
    setLoginModalOpen(false)
  }

  async function handleLogout() {
    if (credentials) {
      fetch(`${PROXY_URL}/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentials.token }),
      }).catch(() => {}) // fire-and-forget
    }
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
        onToggleFavPanel={() => { setFavPanelOpen(v => !v); setQueuePanelOpen(false); setInfoPanelOpen(false) }}
        onOpenRefresh={() => setSyncModalOpen(true)}
        onOpenLogin={() => setLoginModalOpen(true)}
        onLogout={handleLogout}
        onReset={handleReset}
        queueCount={queue.length}
        queuePanelOpen={queuePanelOpen}
        onToggleQueuePanel={() => { setQueuePanelOpen(v => !v); setFavPanelOpen(false); setInfoPanelOpen(false) }}
        userEmail={credentials?.email ?? null}
        onExportCatalog={handleExportCatalog}
        theme={theme}
        onToggleTheme={toggleTheme}
        infoPanelOpen={infoPanelOpen}
        onToggleInfoPanel={() => setInfoPanelOpen(v => !v)}
      />

      {/* ── Non connecté : page d'accueil e-events ── */}
      {!credentials && (
        <HomeScreen onLogin={() => setLoginModalOpen(true)} />
      )}

      {/* ── Connecté : catalogue + panels ── */}
      {credentials && (
        <>
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
                onPreview={playPreview}
                onAddToQueue={async (s) => {
                  try { await addToQueue(s) } catch { /* affiché via songStatus */ }
                }}
                isInQueue={isInQueue}
                songStatus={songStatus}
                previewSongId={previewTrack?.songId}
                previewStatus={
                  previewTrack
                    ? previewLoading ? 'loading' : previewPlaying ? 'playing' : 'idle'
                    : undefined
                }
              />
            )}

            {queuePanelOpen && (
              <QueuePanel
                queue={queue}
                entryStatus={entryStatus}
                hasCredentials={true}
                isLoadingQueue={isLoadingQueue}
                onReload={() => fetchQueue(allSongs)}
                onRemove={removeFromQueue}
                onMove={moveInQueue}
                onClose={() => setQueuePanelOpen(false)}
                onNeedLogin={() => setLoginModalOpen(true)}
              />
            )}

            {infoPanelOpen && (
              <InfoPanel
                session={credentials}
                onClose={() => setInfoPanelOpen(false)}
                onAuthError={handleAuthError}
                onOpenLogin={() => setLoginModalOpen(true)}
                nouveautes={nouveautes}
                favSongs={favSongs}
                onToggleFav={toggleFav}
                queue={queue}
                entryStatus={entryStatus}
                isLoadingQueue={isLoadingQueue}
                onReloadQueue={() => fetchQueue(allSongs)}
                isInQueue={isInQueue}
                onAddToQueue={async (s) => {
                  try { await addToQueue(s) } catch { /* affiché via songStatus */ }
                }}
                onRemoveFromQueue={removeFromQueue}
                onMoveInQueue={moveInQueue}
                songStatus={songStatus}
                onPreview={playPreview}
                previewSongId={previewTrack?.songId}
                previewStatus={
                  previewTrack
                    ? previewLoading ? 'loading' : previewPlaying ? 'playing' : 'idle'
                    : undefined
                }
              />
            )}
          </div>
        </>
      )}

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
          onSync={async () => {
            try {
              await refresh(credentials.token)
            } catch (e) {
              if ((e as Error & { status?: number }).status === 401) handleAuthError()
              else throw e
            }
          }}
          onClose={() => { setSyncModalOpen(false); setRefreshStatus({ state: 'idle' }) }}
          onClearNew={clearNewBadges}
        />
      )}
    </div>
  )
}
