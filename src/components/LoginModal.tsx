import { useState } from 'react'
import { getSavedEmail } from '../utils/session'
import styles from './LoginModal.module.css'

interface Props {
  onLogin: (email: string, password: string) => void
  onClose: () => void
}

export function LoginModal({ onLogin, onClose }: Props) {
  const [email, setEmail] = useState(() => getSavedEmail())
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  function handleSubmit() {
    if (!email || !password) return
    onLogin(email, password)
  }

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

        <div className={styles.field}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="ton@email.com"
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

        <div className={styles.footer}>
          <button className={styles.btnGhost} onClick={onClose}>Annuler</button>
          <button
            className={styles.btnPrimary}
            onClick={handleSubmit}
            disabled={!email || !password}
          >
            Se connecter
          </button>
        </div>
      </div>
    </div>
  )
}
