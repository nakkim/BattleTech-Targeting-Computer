import { useEffect, useState } from 'react'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** useState that is saved to localStorage, falling back to the initial value. */
export function usePersistentState<T>(key: string, initial: () => T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const fallback = initial()
    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        const parsed: unknown = JSON.parse(stored)
        // Merge objects so fields added in newer versions get their defaults.
        if (isPlainObject(fallback) && isPlainObject(parsed)) return { ...fallback, ...parsed } as T
        if (typeof parsed === typeof fallback) return parsed as T
      }
    } catch {
      // Ignore unreadable storage and use the defaults.
    }
    return fallback
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage may be full or blocked; the app still works without it.
    }
  }, [key, value])

  return [value, setValue]
}
