import { useSyncExternalStore } from 'react'
import { asset } from './asset.js'

/**
 * Downloads the fish clips fully into memory (blob URLs) so a swim-through never
 * stalls mid-pass. Started by the hero once the dive-in frames are decoded, so the
 * clips don't compete with the first screen.
 */
export const FISH_CLIPS = [asset('media/fish-a.mp4'), asset('media/fish-b.mp4')]

let state = { done: false, clips: FISH_CLIPS.slice() }
const listeners = new Set()
const emit = (patch) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

let started = null

async function fetchBlob(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  return URL.createObjectURL(await res.blob())
}

export function startPreload() {
  if (started) return started
  started = Promise.all(FISH_CLIPS.map((url) => fetchBlob(url).catch(() => url))).then((clips) => {
    emit({ done: true, clips })
    return state
  })
  return started
}

const subscribe = (l) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function usePreload() {
  return useSyncExternalStore(subscribe, () => state)
}
