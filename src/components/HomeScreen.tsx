import { useState } from 'react'
import styles from './HomeScreen.module.css'

interface Props {
  onLogin: () => void
}

const REGLEMENT_KARAOKE = [
  "Merci de vous connecter via Internet ou 4G.",
  "Les inscriptions sont obligatoires via le QR CODE ou le lien : e-events.codewave.nc",
  "Voir Auguste ou Valérie pour + d'information.",
  "Merci de bien vouloir patienter et attendre votre tour.",
  "Merci de respecter l'ordre de passage — pas de favoritisme.",
  "Pas de passe-droit même pour nos stars habituées.",
]

function ReglementCard() {
  const [tab, setTab] = useState<'karaoke' | 'blindtest'>('karaoke')
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>📋 Règlement</h2>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'karaoke' ? styles.tabActive : ''}`}
          onClick={() => setTab('karaoke')}
        >
          🎤 Karaoké Live
        </button>
        <button
          className={`${styles.tab} ${tab === 'blindtest' ? styles.tabActive : ''}`}
          onClick={() => setTab('blindtest')}
        >
          🎵 Quizz Musical
        </button>
      </div>

      {tab === 'karaoke' && (
        <>
          <p className={styles.sectionIntro}>Pour le bon déroulement de nos soirées Karaoké…</p>
          <ol className={styles.rulesList}>
            {REGLEMENT_KARAOKE.map((r, i) => <li key={i}>{r}</li>)}
          </ol>
          <a href="https://www.eprodnc.com/soireekaraokelive" target="_blank" rel="noopener noreferrer" className={styles.moreLink}>
            En savoir plus sur le Karaoké Live →
          </a>
        </>
      )}

      {tab === 'blindtest' && (
        <>
          <p className={styles.sectionText}>
            Les équipes s'apprêtent à s'affronter dans une série de battles de Blind-Test où chacun devra mettre en avant sa culture musicale pour gagner un maximum de points. Attention, il faudra se montrer réactif pour remporter la mise ! Une épreuve explosive dont le duo Auguste et Kevin est à l'origine.
          </p>
          <p className={styles.sectionText}>
            Plusieurs séries de Blind-Test thématisés sont proposées au choix des opposants parmi un éventail de registres très variés. Les titres ont été minutieusement sélectionnés pour offrir une véritable anthologie musicale qui transportera le public dans un tourbillon de chansons que chacun reprendra en chœur.
          </p>
          <p className={styles.sectionText}>
            L'animation Blind-Test est particulièrement interactive et facile d'accès, garantissant la participation du plus grand nombre. Partenaire de vos événements d'entreprise, la société E EVENTS NC anime vos séminaires, dîners de gala, cocktails, plénières et team building avec des activités conviviales et fédératrices.
          </p>
          <div className={styles.contactBox}>
            📞 Infoline : <strong>79 70 84</strong> ou <strong>73 09 30</strong> — Auguste &amp; Kevin
          </div>
          <a href="https://www.eprodnc.com/quizzteampro" target="_blank" rel="noopener noreferrer" className={styles.moreLink}>
            En savoir plus sur le Quizz Team Pro →
          </a>
        </>
      )}
    </div>
  )
}

export function HomeScreen({ onLogin }: Props) {
  return (
    <div className={styles.root}>
      {/* ── Hero ── */}
      <div className={styles.hero}>
        <div className={styles.heroEmoji}>🎤</div>
        <h1 className={styles.heroTitle}>Soirée E PROD NC</h1>
        <p className={styles.heroSub}>Karaoké live, blind test, animations musicales en Nouvelle-Calédonie</p>
        <a href="https://www.eprodnc.com/" target="_blank" rel="noopener noreferrer" className={styles.heroLink}>
          Découvrir eprodnc.com →
        </a>
      </div>

      <div className={styles.sections}>
        {/* ── Encart Règlement avec onglets ── */}
        <ReglementCard />

        {/* ── Login ── */}
        <div className={styles.loginCard}>
          <div className={styles.loginIcon}>🔑</div>
          <p className={styles.loginText}>
            Connecte-toi pour accéder au catalogue complet, gérer ta liste de favoris et ajouter des chansons à la file d'attente.
          </p>
          <button className={styles.loginBtn} onClick={onLogin}>
            Se connecter
          </button>
          <p className={styles.loginHint}>
            Utilise tes identifiants e-events.codewave.nc
          </p>
        </div>
      </div>
    </div>
  )
}
