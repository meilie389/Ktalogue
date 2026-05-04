import { useState } from 'react'
import type { RefreshStatus } from '../types'
import styles from './RefreshModal.module.css'

interface Props {
  status: RefreshStatus
  onRefresh: (email: string, password: string) => void
  onClose: () => void
  onClearNew: () => void
}

export function RefreshModal({ status, onRefresh, onClose, onClearNew }: Props) {
  const [email, setEmail] = useState(() => localStorage.getItem('kara_email') ?? '')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  function handleSubmit() {
    if (!email || !password) return
    localStorage.setItem('kara_email', email)
    onRefresh(email, password)
  }

  const isLoading = status.state === 'loading'
  const newCount = status.newCount ?? 0

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.title}>🔄 Refresh du catalogue</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <p className={styles.desc}>
          Connexion à <code>e-events.codewave.nc</code> pour récupérer les nouvelles chansons.
          Seules les chansons absentes du catalogue local seront ajoutées.
        </p>

        <div className={styles.field}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="ton@email.com"
            disabled={isLoading}
            autoComplete="email"
          />
        </div>

        <div className={styles.field}>
          <label>Mot de passe</label>
          <div className={styles.passWrap}>
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              autoComplete="current-password"
            />
            <button
              className={styles.eyeBtn}
              onClick={() => setShowPass(v => !v)}
              type="button"
              tabIndex={-1}
            >{showPass ? '🙈' : '👁'}</button>
          </div>
        </div>

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
          <button className={styles.btnGhost} onClick={onClose}>Annuler</button>
          <button
            className={styles.btnPrimary}
            onClick={handleSubmit}
            disabled={isLoading || !email || !password}
          >
            {isLoading ? (
              <span className={styles.spinner}>⟳ Connexion…</span>
            ) : 'Lancer le refresh'}
          </button>
        </div>
      </div>
    </div>
  )
}
