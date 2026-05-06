import styles from './Spinner.module.css'

interface Props {
  size?: number
}

export function Spinner({ size = 14 }: Props) {
  return (
    <span
      className={styles.spinner}
      style={{ width: size, height: size, borderWidth: Math.max(1.5, size / 8) }}
      aria-hidden="true"
    />
  )
}
