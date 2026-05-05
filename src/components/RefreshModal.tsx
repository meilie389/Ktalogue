import type { RefreshStatus } from '../types'
import styles from './RefreshModal.module.css'

interface Props {
  status: RefreshStatus
  userEmail: string
  onSync: () => void
  onClose: () => void
  onClearNew: () => void
}

export function RefreshModal({ status, userEmail, onSync, onClose, onClearNew }: Props) {
  const isLoading = status.state === 'loading'
  const newCount = status.newCount ?? 0

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.title}>🔄 Sync catalogue</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <p className={styles.desc}>
          Connecté en tant que <code>{userEmail}</code>.
          Récupère les nouvelles chansons depuis <code>e-events.codewave.nc</code>.
        </p>

        {status.state === 'success' && (
          <div className={styles.success}>
            {newCount === 0
              ? '✓ Catalogue déjà à jour !'
              : `✨ ${newCount} nouvelle${newCount > 1 ? 's' : ''} chanson${newCount > 1 ? 's' : ''} ajoutée${newCount > 1 ? 's' : ''} !`
            }
            {newCount > 0 && (
              <button className={styles.clearNew} onClick={onClearNew}>
                Effacer les badges "new"
              </button>
            )}
          </div>
        )}

        {status.state === 'error' && (
          <div className={styles.error}>
            ✗ {status.message ?? 'Erreur inconnue'}
          </div>
        )}

        <div className={styles.footer}>
          <button className={styles.btnGhost} onClick={onClose}>Fermer</button>
          <button
            className={styles.btnPrimary}
            onClick={onSync}
            disabled={isLoading}
          >
            {isLoading
              ? <span className={styles.spinner}>⟳ Sync en cours…</span>
              : status.state === 'success' ? 'Resync' : 'Lancer la sync'}
          </button>
        </div>
      </div>
    </div>
  )
}
