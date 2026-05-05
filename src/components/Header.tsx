import type { Filters } from '../types'
import styles from './Header.module.css'

interface Props {
  total: number
  filtered: number
  totalNew: number
  favCount: number
  filters: Filters
  langs: string[]
  favPanelOpen: boolean
  queueCount: number
  queuePanelOpen: boolean
  userEmail: string | null
  onFiltersChange: (f: Partial<Filters>) => void
  onToggleFavPanel: () => void
  onToggleQueuePanel: () => void
  onOpenRefresh: () => void
  onOpenLogin: () => void
  onLogout: () => void
  onReset: () => void
  onExportCatalog: () => void
}

export function Header({
  total, filtered, totalNew, favCount, filters, langs,
  favPanelOpen, queueCount, queuePanelOpen, userEmail,
  onFiltersChange, onToggleFavPanel, onToggleQueuePanel,
  onOpenRefresh, onOpenLogin, onLogout, onReset, onExportCatalog,
}: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.top}>
        <div className={styles.logo} onClick={onReset} title="Retour à l'accueil" style={{ cursor: 'pointer' }}>🎤 Karaoké</div>

        <div className={styles.meta}>
          <span className={styles.pill}>
            <span className={styles.pillNum}>{total.toLocaleString('fr')}</span> titres
          </span>
          {filtered !== total && (
            <span className={styles.pill}>
              <span className={styles.pillNum}>{filtered.toLocaleString('fr')}</span> affichés
            </span>
          )}
        </div>

        <div className={styles.actions}>
          {userEmail ? (
            <>
              <div className={styles.authPill} title={userEmail}>
                <span className={styles.authDot} />
                <span className={styles.authEmail}>{userEmail}</span>
              </div>
              <button
                className={`${styles.refreshBtn} ${totalNew > 0 ? styles.hasNew : ''}`}
                onClick={onOpenRefresh}
                title="Synchroniser le catalogue"
              >
                🔄 Sync
                {totalNew > 0 && <span className={styles.newBadge}>{totalNew}</span>}
              </button>
              <button className={styles.logoutBtn} onClick={onLogout} title="Se déconnecter">
                ⏻
              </button>
            </>
          ) : (
            <button className={styles.loginBtn} onClick={onOpenLogin}>
              🔑 Se connecter
            </button>
          )}

          <button
            className={`${styles.favPanelBtn} ${favPanelOpen ? styles.favPanelOpen : ''} ${favCount > 0 ? styles.hasFavs : ''}`}
            onClick={onToggleFavPanel}
          >
            ♥ Ma liste
            {favCount > 0 && <span className={styles.favBadge}>{favCount}</span>}
          </button>

          <button
            className={`${styles.queueBtn} ${queuePanelOpen ? styles.queueBtnOpen : ''} ${queueCount > 0 ? styles.queueBtnActive : ''}`}
            onClick={onToggleQueuePanel}
            title="File d'attente karaoké"
          >
            🎙 File
            {queueCount > 0 && <span className={styles.queueBadge}>{queueCount}</span>}
          </button>

          {userEmail && userEmail === (import.meta.env.VITE_ADMIN_EMAIL ?? '') && (
            <button
              className={styles.exportBtn}
              onClick={onExportCatalog}
              title="Exporter le catalogue en JSON (pour mettre à jour songs.json)"
            >
              ⬇ Export
            </button>
          )}
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Titre, artiste…"
            value={filters.query}
            onChange={e => onFiltersChange({ query: e.target.value })}
          />
          {filters.query && (
            <button className={styles.clearSearch} onClick={() => onFiltersChange({ query: '' })}>✕</button>
          )}
        </div>

        <select
          className={styles.select}
          value={filters.lang}
          onChange={e => onFiltersChange({ lang: e.target.value })}
        >
          <option value="">Toutes les langues</option>
          {langs.map(l => <option key={l} value={l}>{l}</option>)}
        </select>

        <button
          className={`${styles.chip} ${filters.duo ? styles.chipDuo : ''}`}
          onClick={() => onFiltersChange({ duo: !filters.duo })}
        >
          🎵 Duo
        </button>

        <button
          className={`${styles.chip} ${filters.favOnly ? styles.chipFav : ''}`}
          onClick={() => onFiltersChange({ favOnly: !filters.favOnly })}
        >
          ♥ Favoris
        </button>

        {totalNew > 0 && (
          <button
            className={`${styles.chip} ${filters.newOnly ? styles.chipNew : ''}`}
            onClick={() => onFiltersChange({ newOnly: !filters.newOnly })}
          >
            ✨ Nouveautés ({totalNew})
          </button>
        )}
      </div>
    </header>
  )
}
