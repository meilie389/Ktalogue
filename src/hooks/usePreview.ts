import { useState, useRef, useEffect, useCallback } from 'react'
import type { Song } from '../types'

export interface PreviewTrack {
  songId: number
  title: string
  artist: string
  previewUrl: string
  artworkUrl: string
}

export interface EnrichPayload {
  genre?: string
  durationMs?: number
  itunesId?: number
}

export function usePreview(onEnrich?: (songId: number, data: EnrichPayload) => void) {
  const [current, setCurrent] = useState<PreviewTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)   // 0–1
  const [duration, setDuration] = useState(30)  // iTunes previews = ~30s
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Crée l'élément audio une seule fois
  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'auto'

    audio.addEventListener('play',    () => setIsPlaying(true))
    audio.addEventListener('pause',   () => setIsPlaying(false))
    audio.addEventListener('ended',   () => { setIsPlaying(false); setProgress(0) })
    audio.addEventListener('canplay', () => setIsLoading(false))
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration || 30))
    audio.addEventListener('timeupdate', () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration)
    })

    audioRef.current = audio
    return () => { audio.pause(); audio.src = '' }
  }, [])

  // Quand `current` change → charge et joue
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !current) return
    audio.src = current.previewUrl
    audio.load()
    audio.play().catch(() => {}) // ignore autoplay block silencieux
  }, [current?.previewUrl])

  const playPreview = useCallback(async (song: Song) => {
    // Même chanson → toggle
    if (current?.songId === song.id) {
      const audio = audioRef.current
      if (!audio) return
      isPlaying ? audio.pause() : audio.play().catch(() => {})
      return
    }

    setIsLoading(true)
    setProgress(0)
    try {
      const q = encodeURIComponent(`${song.title} ${song.artist}`)
      const res = await fetch(
        `https://itunes.apple.com/search?term=${q}&entity=song&limit=3&country=US`
      )
      const json = await res.json()

      // Prend le premier résultat avec un previewUrl
      const hit = json.results?.find((r: any) => r.previewUrl) ?? null
      if (!hit) throw new Error('Aucun extrait disponible')

      // Enrichissement iTunes (passif)
      if (onEnrich) {
        onEnrich(song.id, {
          genre: hit.primaryGenreName ?? undefined,
          durationMs: hit.trackTimeMillis ?? undefined,
          itunesId: hit.trackId ?? undefined,
        })
      }

      setCurrent({
        songId: song.id,
        title: hit.trackName ?? song.title,
        artist: hit.artistName ?? song.artist,
        previewUrl: hit.previewUrl,
        artworkUrl: (hit.artworkUrl100 ?? '').replace('100x100bb', '300x300bb'),
      })
    } catch {
      setIsLoading(false)
      // Pas de throw : l'erreur est silencieuse, le bouton revient à l'état normal
      setCurrent(null)
    }
  }, [current?.songId, isPlaying])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    isPlaying ? audio.pause() : audio.play().catch(() => {})
  }, [isPlaying])

  const seek = useCallback((ratio: number) => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    audio.currentTime = ratio * audio.duration
  }, [])

  const stop = useCallback(() => {
    audioRef.current?.pause()
    setCurrent(null)
    setIsPlaying(false)
    setProgress(0)
  }, [])

  return {
    current,
    isPlaying,
    isLoading,
    progress,
    duration,
    playPreview,
    togglePlay,
    seek,
    stop,
  }
}
