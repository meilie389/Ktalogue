import { useEffect } from 'react'
import styles from './BottomSheet.module.css'

interface Props {
  title: React.ReactNode
  onClose: () => void
  children: React.ReactNode
  /** Nœuds supplémentaires dans le header (ex: bouton reload) */
  headerActions?: React.ReactNode
}

export function BottomSheet({ title, onClose, children, headerActions }: Props) {
  // Empêche le scroll du body pendant que le sheet est ouvert
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.sheet}>
        <div className={styles.handle} />
        <div className={styles.sheetHeader}>
          <span className={styles.sheetTitle}>{title}</span>
          {headerActions}
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className={styles.sheetBody}>
          {children}
        </div>
      </div>
    </div>
  )
}
