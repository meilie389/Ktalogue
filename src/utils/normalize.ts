import type { Song, Lang } from '../types'

const LANG_MAP: Record<string, Lang> = {
  anglais: 'Anglais', english: 'Anglais', a: 'Anglais',
  francais: 'Français', français: 'Français',
  'francais ': 'Français', 'français ': 'Français',
  f: 'Français', french: 'Français',
  espagnol: 'Espagnol/Latin', spanish: 'Espagnol/Latin',
  latino: 'Espagnol/Latin', latin: 'Espagnol/Latin',
  italien: 'Italien', sicilien: 'Italien',
  allemand: 'Allemand',
  'coréen': 'Coréen',
  japonnais: 'Japonais', japonais: 'Japonais',
  portugais: 'Portugais',
  tahitien: 'Tahitien',
  'créole': 'Créole', 'créole haïtien': 'Créole',
  local: 'Local', 'local à nous': 'Local',
  maori: 'Maori',
  hawaiian: 'Autre', indian: 'Autre', russe: 'Autre',
}

export function normalizeLang(album: string | null): Lang {
  if (!album) return 'Autre'
  const key = album.trim().toLowerCase()
  return LANG_MAP[key] ?? 'Autre'
}

export function normalizeSong(s: Song): Song & { lang: Lang; _search: string } {
  return {
    ...s,
    title: (s.title ?? '').trim(),
    artist: (s.artist ?? '').trim(),
    lang: normalizeLang(s.album),
    _search: `${(s.title ?? '').toLowerCase()} ${(s.artist ?? '').toLowerCase()}`,
  }
}

export function getArtistMap(songs: Song[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const s of songs) {
    const a = (s.artist ?? '—').trim()
    map.set(a, (map.get(a) ?? 0) + 1)
  }
  return map
}
