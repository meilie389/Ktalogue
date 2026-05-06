import styles from './HomeScreen.module.css'

interface Props {
  onLogin: () => void
}

export function HomeScreen({ onLogin }: Props) {
  return (
    <div className={styles.root}>
      <div className={styles.hero}>
        <div className={styles.logo}>Ktalogue</div>
        <p className={styles.tagline}>
          Retrouve toutes les chansons du karaoké et gère ta file d'attente.
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.lockIcon}>🎤</div>
        <p className={styles.cardText}>
          Connecte-toi pour accéder au catalogue et ajouter des chansons à la file.
        </p>
        <button className={styles.loginBtn} onClick={onLogin}>
          Se connecter
        </button>
        <p className={styles.hint}>
          Utilise tes identifiants e-events.codewave.nc
        </p>
      </div>
    </div>
  )
}
