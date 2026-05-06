import { useState, useRef, useEffect } from 'react'
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
  infoPanelOpen: boolean
  onToggleInfoPanel: () => void
}

export function Header({
  total, filtered, totalNew, favCount, filters, langs,
  favPanelOpen, queueCount, queuePanelOpen, userEmail,
  onFiltersChange, onToggleFavPanel, onToggleQueuePanel,
  onOpenRefresh, onOpenLogin, onLogout, onReset, onExportCatalog,
  infoPanelOpen, onToggleInfoPanel,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isAdmin = !!userEmail && userEmail === (import.meta.env.VITE_ADMIN_EMAIL ?? '')

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

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
              <div className={styles.userMenu} ref={menuRef}>
                <button
                  className={`${styles.authPill} ${menuOpen ? styles.authPillOpen : ''}`}
                  onClick={() => setMenuOpen(v => !v)}
                >
                  <span className={styles.authDot} />
                  <span className={styles.authEmail}>{userEmail}</span>
                  <span className={styles.authChevron}>{menuOpen ? '▴' : '▾'}</span>
                </button>
                {menuOpen && (
                  <div className={styles.userDropdown}>
                    <div className={styles.userDropdownEmail}>{userEmail}</div>
                    <div className={styles.userDropdownDivider} />
                    <button
                      className={`${styles.userDropdownItem} ${totalNew > 0 ? styles.userDropdownItemNew : ''}`}
                      onClick={() => { onOpenRefresh(); setMenuOpen(false) }}
                    >
                      🔄 Synchroniser{totalNew > 0 && <span className={styles.queueBadge}>{totalNew}</span>}
                    </button>
                    {isAdmin && (
                      <button
                        className={styles.userDropdownItem}
                        onClick={() => { onExportCatalog(); setMenuOpen(false) }}
                      >
                        ⬇ Exporter le catalogue
                      </button>
                    )}
                    <button
                      className={`${styles.userDropdownItem} ${styles.userDropdownItemDanger}`}
                      onClick={() => { onLogout(); setMenuOpen(false) }}
                    >
                      ⏻ Se déconnecter
                    </button>
                  </div>
                )}
              </div>
              <button
                className={`${styles.refreshBtn} ${totalNew > 0 ? styles.hasNew : ''}`}
                onClick={onOpenRefresh}
                title="Synchroniser le catalogue"
              >
                🔄 <span className={styles.btnLabel}>Sync</span>
                {totalNew > 0 && <span className={styles.newBadge}>{totalNew}</span>}
              </button>
            </>
          ) : (
            <button className={styles.loginBtn} onClick={onOpenLogin}>
              🔑 <span className={styles.btnLabel}>Se connecter</span>
            </button>
          )}

          <button
            className={`${styles.favPanelBtn} ${favPanelOpen ? styles.favPanelOpen : ''} ${favCount > 0 ? styles.hasFavs : ''}`}
            onClick={onToggleFavPanel}
            title="Mes favoris"
          >
            ♥<span className={styles.btnLabel}> Ma liste</span>
            {favCount > 0 && <span className={styles.favBadge}>{favCount}</span>}
          </button>

          <button
            className={`${styles.queueBtn} ${queuePanelOpen ? styles.queueBtnOpen : ''} ${queueCount > 0 ? styles.queueBtnActive : ''}`}
            onClick={onToggleQueuePanel}
            title="File d'attente karaoké"
          >
            🎙<span className={styles.btnLabel}> File</span>
            {queueCount > 0 && <span className={styles.queueBadge}>{queueCount}</span>}
          </button>

          <button
            className={`${styles.infoBtn} ${infoPanelOpen ? styles.infoBtnOpen : ''}`}
            onClick={onToggleInfoPanel}
            title="Infos soirée"
          >
            ℹ️<span className={styles.btnLabel}> Infos</span>
          </button>

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
