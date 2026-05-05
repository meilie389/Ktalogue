import { useState, useCallback } from 'react'
import type { Song, Credentials, QueueEntry } from '../types'
import { PROXY_URL } from './useSongs'

type ActionStatus = 'idle' | 'loading' | 'error'

function isAuthError(message: string) {
  const m = message.toLowerCase()
  return m.includes('authentification') || m.includes('session') ||
         m.includes('login') || m.includes('unauthorized') || m.includes('401') || m.includes('403')
}

export function useQueue(credentials: Credentials | null, onAuthError?: () => void) {
  const [queue, setQueue] = useState<QueueEntry[]>([])
  // status par song.id (pour le bouton +) ou par karaokeId (pour remove/move)
  const [songStatus, setSongStatus] = useState<Record<number, ActionStatus>>({})
  const [entryStatus, setEntryStatus] = useState<Record<number, ActionStatus>>({})

  const isInQueue = useCallback(
    (songId: number) => queue.some(e => e.song.id === songId),
    [queue]
  )

  const addToQueue = useCallback(async (song: Song) => {
    if (!credentials) throw new Error('Non connecté')
    if (isInQueue(song.id)) return

    setSongStatus(prev => ({ ...prev, [song.id]: 'loading' }))
    try {
      const res = await fetch(`${PROXY_URL}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, song_id: song.id }),
      })
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
  }, [credentials, isInQueue, onAuthError])

  const removeFromQueue = useCallback(async (entry: QueueEntry) => {
    if (!credentials) return
    if (entry.karaokeId === null) {
      // Suppression locale uniquement si pas d'id
      setQueue(prev => prev.filter(e => e.song.id !== entry.song.id))
      return
    }
    setEntryStatus(prev => ({ ...prev, [entry.song.id]: 'loading' }))
    try {
      const res = await fetch(`${PROXY_URL}/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, karaoke_id: entry.karaokeId }),
      })
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
  }, [credentials, onAuthError])

  const moveInQueue = useCallback(async (entry: QueueEntry, direction: 'up' | 'down') => {
    if (!credentials) return
    if (entry.karaokeId === null) return

    setEntryStatus(prev => ({ ...prev, [entry.song.id]: 'loading' }))
    try {
      const res = await fetch(`${PROXY_URL}/change-position`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, karaoke_id: entry.karaokeId, direction }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      // Mise à jour locale de l'ordre
      setQueue(prev => {
        const idx = prev.findIndex(e => e.song.id === entry.song.id)
        if (idx < 0) return prev
        const next = [...prev]
        const target = direction === 'up' ? idx - 1 : idx + 1
        if (target < 0 || target >= next.length) return prev
        ;[next[idx], next[target]] = [next[target], next[idx]]
        return next
      })
      setEntryStatus(prev => { const n = { ...prev }; delete n[entry.song.id]; return n })
    } catch (e) {
      const msg = (e as Error).message
      setEntryStatus(prev => ({ ...prev, [entry.song.id]: 'error' }))
      setTimeout(() => setEntryStatus(prev => { const n = { ...prev }; delete n[entry.song.id]; return n }), 2500)
      if (isAuthError(msg)) onAuthError?.()
    }
  }, [credentials, onAuthError])

  const clearQueue = useCallback(() => setQueue([]), [])

  return { queue, isInQueue, addToQueue, removeFromQueue, moveInQueue, clearQueue, songStatus, entryStatus }
}
