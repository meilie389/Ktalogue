import { useState } from 'react'
import type { RefreshStatus } from '../types'
import { getSavedEmail } from '../utils/session'
import styles from './LoginModal.module.css'

interface Props {
  status: RefreshStatus
  onLogin: (email: string, password: string) => void
  onClose: () => void
  onClearNew: () => void
}

export function LoginModal({ status, onLogin, onClose, onClearNew }: Props) {
  const [email, setEmail] = useState(() => getSavedEmail())
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  function handleSubmit() {
    if (!email || !password) return
    onLogin(email, password)
  }

  const isLoading = status.state === 'loading'
  const isSuccess = status.state === 'success'
  const newCount = status.newCount ?? 0

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.title}>🎤 Connexion</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <p className={styles.desc}>
          Connecte-toi à <code>e-events.codewave.nc</code> pour accéder à la file d'attente
          et synchroniser le catalogue.
        </p>

        {!isSuccess ? (
          <>
            <div className={styles.field}>
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ton@email.com"
                disabled={isLoading}
                autoComplete="email"
                autoFocus
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

            {status.state === 'error' && (
              <div className={styles.error}>
                ✗ {status.message ?? 'Identifiants incorrects ou session expirée'}
              </div>
            )}

            <div className={styles.footer}>
              <button className={styles.btnGhost} onClick={onClose}>Annuler</button>
              <button
                className={styles.btnPrimary}
                onClick={handleSubmit}
                disabled={isLoading || !email || !password}
              >
                {isLoading
                  ? <span className={styles.spinner}>⟳ Connexion…</span>
                  : 'Se connecter'}
              </button>
            </div>
          </>
        ) : (
          <div className={styles.successBlock}>
            <div className={styles.successIcon}>✓</div>
            <div className={styles.successMsg}>
              Connecté !
              {newCount > 0
                ? ` ${newCount} nouvelle${newCount > 1 ? 's' : ''} chanson${newCount > 1 ? 's' : ''} ajoutée${newCount > 1 ? 's' : ''}.`
                : ' Catalogue à jour.'}
            </div>
            {newCount > 0 && (
              <button className={styles.clearNew} onClick={onClearNew}>
                Effacer les badges "new"
              </button>
            )}
            <button className={styles.btnPrimary} onClick={onClose}>
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
