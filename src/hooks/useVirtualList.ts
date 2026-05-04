import { useState, useCallback, useRef, useEffect } from 'react'

const PAGE = 60

export function useVirtualList<T>(items: T[]) {
  const [limit, setLimit] = useState(PAGE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Reset limit when items change
  useEffect(() => {
    setLimit(PAGE)
  }, [items])

  const onSentinel = useCallback((node: HTMLDivElement | null) => {
    sentinelRef.current = node
    if (!node) return
    const obs = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setLimit(prev => Math.min(prev + PAGE, items.length + PAGE))
        }
      },
      { rootMargin: '400px' }
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [items.length])

  return {
    visible: items.slice(0, limit),
    sentinelRef: onSentinel,
    hasMore: limit < items.length,
  }
}
