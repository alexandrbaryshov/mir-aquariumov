import { useSyncExternalStore } from 'react'
import { asset } from './asset.js'

/**
 * Downloads the fish clips fully into memory (blob URLs) so a swim-through never
 * stalls mid-pass. Phones and data-saver connections get lighter encodes. Clips
 * download one after another, first clip first: the first pass can start as soon
 * as it is in memory instead of waiting for both.
 */
const light =
  typeof window !== 'undefined' &&
  (window.matchMedia('(max-width: 900px)').matches ||
    navigator.connection?.saveData ||
    /(^|-)(2g|3g)$/.test(navigator.connection?.effectiveType ?? ''))

export const FISH_CLIPS = ['fish-a', 'fish-b'].map((name) => asset(`media/${name}${light ? '-m' : ''}.mp4`))

// `clips[i]` is null until clip i can be played. `settled` turns true once the first
// screen has what it needs (first clip in memory, or the visitor started scrolling):
// images below the fold wait for it so they don't eat a slow connection meanwhile.
let state = { clips: FISH_CLIPS.map(() => null), settled: false }
const listeners = new Set()
const emit = (patch) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export function settle() {
  if (!state.settled) emit({ settled: true })
}
if (typeof window !== 'undefined') window.addEventListener('scroll', settle, { once: true, passive: true })

let started = null

async function fetchBlob(url) {
  const res = await fetch(url, { priority: 'high' })
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  return URL.createObjectURL(await res.blob())
}

export function startPreload() {
  if (started) return started
  started = (async () => {
    for (const [i, url] of FISH_CLIPS.entries()) {
      // On a failed download fall back to streaming the clip from the network.
      const src = await fetchBlob(url).catch(() => url)
      const clips = state.clips.slice()
      clips[i] = src
      emit({ clips })
      settle()
    }
    return state
  })()
  return started
}

const subscribe = (l) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function usePreload() {
  return useSyncExternalStore(subscribe, () => state)
}
