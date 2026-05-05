import { useState, useEffect, useMemo, useCallback } from 'react'
import type { Song, Filters, RefreshStatus } from '../types'
import { normalizeSong, normalizeLang } from '../utils/normalize'

// Récupère automatiquement le fichier songs-*.json le plus récent (tri alphabétique = chronologique)
const songModules = import.meta.glob('../data/songs-*.json', { eager: true })
const latestKey = Object.keys(songModules).sort().at(-1)!
const rawSongs = (songModules[latestKey] as { default: unknown }).default as Song[]

const FAVS_KEY = 'kara_favs_v2'
const SONGS_KEY = 'kara_songs_v2'
const NEW_IDS_KEY = 'kara_new_ids'
const ENRICH_KEY = 'kara_enrich_v1'

// Proxy URL — à remplacer par ton URL Deno Deploy
export const PROXY_URL = import.meta.env.VITE_PROXY_URL ?? 'https://YOUR_PROXY.deno.dev'

export const proxyHeaders = {
  'Content-Type': 'application/json',
}

function loadFavIds(): Set<number> {
  try {
    const raw = localStorage.getItem(FAVS_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch { return new Set() }
}

function loadExtraSongs(): Song[] {
  try {
    const raw = localStorage.getItem(SONGS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function loadNewIds(): Set<number> {
  try {
    const raw = localStorage.getItem(NEW_IDS_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch { return new Set() }
}

type EnrichData = { genre?: string; durationMs?: number; itunesId?: number }

function loadEnrichMap(): Map<number, EnrichData> {
  try {
    const raw = localStorage.getItem(ENRICH_KEY)
    return raw ? new Map(JSON.parse(raw)) : new Map()
  } catch { return new Map() }
}

export function useSongs() {
  // Base songs (bundled) + extras fetched via refresh
  const baseSongs = useMemo(() => (rawSongs as Song[]).map(normalizeSong), [])
  const baseIds = useMemo(() => new Set(baseSongs.map(s => s.id)), [baseSongs])

  const [extraSongs, setExtraSongs] = useState<Song[]>(() => loadExtraSongs().map(normalizeSong))
  const [newIds, setNewIds] = useState<Set<number>>(() => loadNewIds())
  const [favIds, setFavIds] = useState<Set<number>>(loadFavIds)
  const [enrichMap, setEnrichMap] = useState<Map<number, EnrichData>>(() => loadEnrichMap())
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus>({ state: 'idle' })

  // Merge: base + extras (deduped), with enrichment overlay
  const allSongs = useMemo(() => {
    const all = [...baseSongs, ...extraSongs]
    return all.map(s => ({
      ...s,
      isNew: newIds.has(s.id),
      ...enrichMap.get(s.id),
    }))
  }, [baseSongs, extraSongs, newIds, enrichMap])

  // Persist favs
  useEffect(() => {
    localStorage.setItem(FAVS_KEY, JSON.stringify([...favIds]))
  }, [favIds])

  // Persist extra songs
  useEffect(() => {
    localStorage.setItem(SONGS_KEY, JSON.stringify(extraSongs))
  }, [extraSongs])

  // Persist new ids
  useEffect(() => {
    localStorage.setItem(NEW_IDS_KEY, JSON.stringify([...newIds]))
  }, [newIds])

  // Persist enrich map
  useEffect(() => {
    localStorage.setItem(ENRICH_KEY, JSON.stringify([...enrichMap.entries()]))
  }, [enrichMap])

  const toggleFav = useCallback((id: number) => {
    setFavIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const clearFavs = useCallback(() => setFavIds(new Set()), [])

  const clearNewBadges = useCallback(() => {
    setNewIds(new Set())
  }, [])

  const enrichSong = useCallback((id: number, data: EnrichData) => {
    setEnrichMap(prev => {
      const next = new Map(prev)
      next.set(id, { ...prev.get(id), ...data })
      return next
    })
  }, [])

  const refresh = useCallback(async (email: string, password: string) => {
    setRefreshStatus({ state: 'loading' })
    try {
      const res = await fetch(`${PROXY_URL}/search`, {
        method: 'POST',
        headers: proxyHeaders,
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || `HTTP ${res.status}`)
      }
      const fetched: Song[] = await res.json()
      const knownIds = new Set([...baseIds, ...extraSongs.map(s => s.id)])
      const freshNews = fetched.filter(s => !knownIds.has(s.id))

      if (freshNews.length === 0) {
        setNewIds(new Set()) // plus rien de nouveau → efface les badges
        setRefreshStatus({ state: 'success', newCount: 0, message: 'Catalogue déjà à jour ✓' })
        return
      }

      const normalized = freshNews.map(normalizeSong)
      setExtraSongs(prev => {
        const existing = new Set(prev.map(s => s.id))
        const toAdd = normalized.filter(s => !existing.has(s.id))
        return [...prev, ...toAdd]
      })
      // Remplace (ne cumule pas) — seules les nouveautés du DERNIER sync sont marquées
      setNewIds(new Set(freshNews.map(s => s.id)))
      setRefreshStatus({ state: 'success', newCount: freshNews.length })
    } catch (e) {
      setRefreshStatus({ state: 'error', message: (e as Error).message })
    }
  }, [baseIds, extraSongs])

  const langs = useMemo(() => {
    const set = new Set(allSongs.map(s => normalizeLang(s.album)))
    return [...set].sort()
  }, [allSongs])

  const artists = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of allSongs) {
      const a = (s.artist || '—').trim()
      map.set(a, (map.get(a) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'))
  }, [allSongs])

  function filterSongs(filters: Filters, activeArtist: string | null) {
    const q = filters.query.toLowerCase().trim()
    return allSongs.filter(s => {
      if (q && !(s as any)._search.includes(q)) return false
      if (filters.lang && normalizeLang(s.album) !== filters.lang) return false
      if (activeArtist && (s.artist || '—').trim() !== activeArtist) return false
      if (filters.duo && !s.duo) return false
      if (filters.favOnly && !favIds.has(s.id)) return false
      if (filters.newOnly && !newIds.has(s.id)) return false
      return true
    })
  }

  return {
    allSongs,
    favIds,
    newIds,
    langs,
    artists,
    refreshStatus,
    setRefreshStatus,
    toggleFav,
    clearFavs,
    clearNewBadges,
    enrichSong,
    refresh,
    filterSongs,
    totalNew: newIds.size,
  }
}
