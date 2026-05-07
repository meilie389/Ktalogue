import { useState, useRef, useEffect } from 'react'
import type { Theme } from '../hooks/useTheme'
import styles from './Header.module.css'

interface Props {
  total: number
  filtered: number
  totalNew: number
  queueCount: number
  queuePanelOpen: boolean
  userEmail: string | null
  theme: Theme
  onToggleQueuePanel: () => void
  onOpenRefresh: () => void
  onOpenLogin: () => void
  onLogout: () => void
  onReset: () => void
  onExportCatalog: () => void
  onToggleTheme: () => void
  infoPanelOpen: boolean
  onToggleInfoPanel: () => void
}

export function Header({
  total, filtered, totalNew,
  queueCount, queuePanelOpen, userEmail, theme,
  onToggleQueuePanel,
  onOpenRefresh, onOpenLogin, onLogout, onReset, onExportCatalog,
  onToggleTheme, infoPanelOpen, onToggleInfoPanel,
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
      {/* Ligne 1 : Logo + compteurs + email dropdown */}
      <div className={styles.top}>
        {userEmail ? (
          <div className={styles.logo} onClick={onReset} title="Retour à l'accueil" style={{ cursor: 'pointer' }}>
            🎤 Karaoké
          </div>
        ) : (
          <a href="https://www.eprodnc.com/" target="_blank" rel="noopener noreferrer" className={styles.logo} title="E PROD NC">
            🎤
          </a>
        )}

        {userEmail && (
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
        )}

        <div className={styles.actions}>
          {userEmail ? (
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
          ) : (
            <button className={styles.loginBtn} onClick={onOpenLogin}>
              🔑 <span className={styles.btnLabel}>Se connecter</span>
            </button>
          )}
        </div>
      </div>

      {/* Ligne 2 : Sync + File + Infos + Thème — connecté seulement */}
      {userEmail && (
        <div className={styles.toolbar}>
          <button
            className={`${styles.refreshBtn} ${totalNew > 0 ? styles.hasNew : ''}`}
            onClick={onOpenRefresh}
            title="Synchroniser le catalogue"
          >
            🔄 <span className={styles.btnLabel}>Sync</span>
            {totalNew > 0 && <span className={styles.newBadge}>{totalNew}</span>}
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

          <button
            className={styles.themeBtn}
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      )}

      {/* Thème seul quand non connecté */}
      {!userEmail && (
        <div className={styles.toolbar}>
          <button
            className={styles.themeBtn}
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      )}
    </header>
  )
}
