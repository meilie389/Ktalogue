import { useState, useCallback } from 'react'
import type { Song, Session, QueueEntry } from '../types'
import { PROXY_URL, proxyHeaders } from './useSongs'

type ActionStatus = 'idle' | 'loading' | 'error'

function isAuthError(message: string) {
  const m = message.toLowerCase()
  return m.includes('authentification') || m.includes('session') ||
         m.includes('login') || m.includes('unauthorized') || m.includes('401') || m.includes('403')
}

export function useQueue(session: Session | null, onAuthError?: () => void) {
  const [queue, setQueue] = useState<QueueEntry[]>([])
  const [isLoadingQueue, setIsLoadingQueue] = useState(false)
  const [songStatus, setSongStatus] = useState<Record<number, ActionStatus>>({})
  const [entryStatus, setEntryStatus] = useState<Record<number, ActionStatus>>({})

  const isInQueue = useCallback(
    (songId: number) => queue.some(e => e.song.id === songId),
    [queue]
  )

  const addToQueue = useCallback(async (song: Song) => {
    if (!session) throw new Error('Non connecté')
    if (isInQueue(song.id)) return

    setSongStatus(prev => ({ ...prev, [song.id]: 'loading' }))
    try {
      const res = await fetch(`${PROXY_URL}/add`, {
        method: 'POST',
        headers: proxyHeaders,
        body: JSON.stringify({ token: session!.token, song_id: song.id }),
      })
      if (res.status === 401) { onAuthError?.(); return }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      // L'API peut retourner l'id de la file sous différents noms
      const karaokeId: number | null = data?.id ?? data?.karaoke_id ?? data?.karaokeId ?? null
      setQueue(prev => [...prev, { song, karaokeId }])
      setSongStatus(prev => { const n = { ...prev }; delete n[song.id]; return n })
    } catch (e) {
      const msg = (e as Error).message
      setSongStatus(prev => ({ ...prev, [song.id]: 'error' }))
      setTimeout(() => setSongStatus(prev => { const n = { ...prev }; delete n[song.id]; return n }), 2500)
      if (isAuthError(msg)) { onAuthError?.(); return }
      throw e
    }
  }, [session, isInQueue, onAuthError])

  const removeFromQueue = useCallback(async (entry: QueueEntry) => {
    if (!session) return
    if (entry.karaokeId === null) {
      // Suppression locale uniquement si pas d'id
      setQueue(prev => prev.filter(e => e.song.id !== entry.song.id))
      return
    }
    setEntryStatus(prev => ({ ...prev, [entry.song.id]: 'loading' }))
    try {
      const res = await fetch(`${PROXY_URL}/remove`, {
        method: 'POST',
        headers: proxyHeaders,
        body: JSON.stringify({ token: session!.token, karaoke_id: entry.karaokeId }),
      })
      if (res.status === 401) { onAuthError?.(); return }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      setQueue(prev => prev.filter(e => e.song.id !== entry.song.id))
      setEntryStatus(prev => { const n = { ...prev }; delete n[entry.song.id]; return n })
    } catch (e) {
      const msg = (e as Error).message
      setEntryStatus(prev => ({ ...prev, [entry.song.id]: 'error' }))
      setTimeout(() => setEntryStatus(prev => { const n = { ...prev }; delete n[entry.song.id]; return n }), 2500)
      if (isAuthError(msg)) onAuthError?.()
    }
  }, [session, onAuthError])

  const moveInQueue = useCallback(async (entry: QueueEntry, direction: 'up' | 'down') => {
    if (!session) return
    if (entry.karaokeId === null) return

    setEntryStatus(prev => ({ ...prev, [entry.song.id]: 'loading' }))
    try {
      const res = await fetch(`${PROXY_URL}/change-position`, {
        method: 'POST',
        headers: proxyHeaders,
        body: JSON.stringify({ token: session!.token, karaoke_id: entry.karaokeId, direction }),
      })
      if (res.status === 401) { onAuthError?.(); return }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      // Bug API : l'item déplacé hérite du karaokeId de sa destination.
      // L'item destination garde son propre karaokeId (les deux se retrouvent avec le même id).
      // On simule ce comportement localement pour que les prochains appels utilisent le bon id.
      setQueue(prev => {
        const idx = prev.findIndex(e => e.song.id === entry.song.id)
        if (idx < 0) return prev
        const next = [...prev]
        const target = direction === 'up' ? idx - 1 : idx + 1
        if (target < 0 || target >= next.length) return prev

        const movedItem   = next[idx]    // item qu'on déplace
        const bumpedItem  = next[target] // item qui se fait pousser

        // L'item déplacé prend le karaokeId de la destination
        next[target] = { ...movedItem,  karaokeId: bumpedItem.karaokeId }
        // L'item poussé garde son propre karaokeId
        next[idx]    = bumpedItem

        return next
      })
      setEntryStatus(prev => { const n = { ...prev }; delete n[entry.song.id]; return n })
    } catch (e) {
      const msg = (e as Error).message
      setEntryStatus(prev => ({ ...prev, [entry.song.id]: 'error' }))
      setTimeout(() => setEntryStatus(prev => { const n = { ...prev }; delete n[entry.song.id]; return n }), 2500)
      if (isAuthError(msg)) onAuthError?.()
    }
  }, [session, onAuthError])

  const clearQueue = useCallback(() => setQueue([]), [])

  const fetchQueue = useCallback(async (allSongs?: Song[]) => {
    if (!session) return
    setIsLoadingQueue(true)
    try {
      const res = await fetch(`${PROXY_URL}/queue`, {
        method: 'POST',
        headers: proxyHeaders,
        body: JSON.stringify({ token: session!.token }),
      })
      if (res.status === 401) { onAuthError?.(); return }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const data: Array<{ karaokeId: number; title: string; artist: string }> = await res.json()

      const newQueue: QueueEntry[] = data.map(item => {
        // Cherche dans le catalogue local (correspondance titre + artiste)
        const catalogSong = allSongs?.find(
          s => s.title.trim().toLowerCase() === item.title.toLowerCase() &&
               s.artist.trim().toLowerCase() === item.artist.toLowerCase()
        )
        return {
          song: catalogSong ?? {
            id: -(item.karaokeId), // id négatif pour ne pas collisionner avec le catalogue
            title: item.title,
            artist: item.artist,
            album: null,
            created_at: null,
            updated_at: null,
            duo: false,
          },
          karaokeId: item.karaokeId,
        }
      })

      setQueue(newQueue)
    } catch (e) {
      const msg = (e as Error).message
      if (isAuthError(msg)) onAuthError?.()
    } finally {
      setIsLoadingQueue(false)
    }
  }, [session, onAuthError])

  return { queue, isInQueue, isLoadingQueue, fetchQueue, addToQueue, removeFromQueue, moveInQueue, clearQueue, songStatus, entryStatus }
}
