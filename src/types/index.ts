export interface Song {
  id: number
  title: string
  artist: string
  album: string | null
  created_at: string | null
  updated_at: string | null
  duo: boolean
  isNew?: boolean // flagged after refresh
  // iTunes enrichment (populated lazily on first preview)
  genre?: string
  durationMs?: number
  itunesId?: number
}

export type Lang =
  | 'Anglais'
  | 'Français'
  | 'Espagnol/Latin'
  | 'Italien'
  | 'Allemand'
  | 'Japonais'
  | 'Portugais'
  | 'Tahitien'
  | 'Créole'
  | 'Local'
  | 'Maori'
  | 'Coréen'
  | 'Autre'

export interface Filters {
  query: string
  lang: string
  duo: boolean
  favOnly: boolean
  newOnly: boolean
}

export type SortKey = 'title' | 'artist' | 'added'

export interface RefreshStatus {
  state: 'idle' | 'loading' | 'success' | 'error'
  newCount?: number
  message?: string
}

export interface Credentials {
  email: string
  password: string
}

export interface QueueEntry {
  song: Song
  karaokeId: number | null  // null si l'API ne retourne pas l'id
}
