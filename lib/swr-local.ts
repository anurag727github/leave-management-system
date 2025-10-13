"use client"

import useSWR from "swr"

const fetcher = (key: string) => {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function useLocalStorageSWR<T>(key: string) {
  const swr = useSWR<T | null>(key, fetcher, { revalidateOnFocus: false })
  function set(value: T | null) {
    if (typeof window === "undefined") return
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
    // @ts-expect-error manual mutate type
    swr.mutate(value, { revalidate: false })
  }
  return { ...swr, set }
}
