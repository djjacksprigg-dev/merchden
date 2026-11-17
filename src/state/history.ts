/**
 * Undo / redo and the "unsaved changes" flag.
 * Snapshots are references to immutable state slices, so they are cheap.
 * Rapid changes (dragging a slider) are merged into one undo step.
 */
import { useStudio, type StudioState } from './studio'

const KEYS = ['design', 'drafts', 'collection', 'logos', 'project', 'brandKit', 'portfolio', 'projectName'] as const
type Snapshot = Pick<StudioState, (typeof KEYS)[number]>

const take = (s: StudioState): Snapshot => Object.fromEntries(KEYS.map((k) => [k, s[k]])) as Snapshot
const same = (a: Snapshot, b: Snapshot) => KEYS.every((k) => a[k] === b[k])

const past: Snapshot[] = []
const future: Snapshot[] = []
let last: Snapshot | null = null
let lastChange = 0
let applying = false
let silent = false
const LIMIT = 100

export function startHistory() {
  last = take(useStudio.getState())
  useStudio.subscribe((s) => {
    const snap = take(s)
    if (!last || same(snap, last)) return
    if (applying) {
      last = snap
      return
    }
    const now = Date.now()
    if (now - lastChange > 600) {
      past.push(last)
      if (past.length > LIMIT) past.shift()
      future.length = 0
    }
    lastChange = now
    last = snap
    const patch: Partial<StudioState> = {}
    if (!silent && !s.dirty) patch.dirty = true
    if (s.canUndo !== past.length > 0 || s.canRedo !== future.length > 0) {
      patch.canUndo = past.length > 0
      patch.canRedo = future.length > 0
    }
    if (Object.keys(patch).length) {
      applying = true
      useStudio.setState(patch)
      applying = false
    }
  })
}

function restore(snap: Snapshot) {
  applying = true
  const s = useStudio.getState()
  const layerIds = new Set(snap.design.layers.map((l) => l.id))
  useStudio.setState({
    ...snap,
    selectedLayerId: s.selectedLayerId && layerIds.has(s.selectedLayerId) ? s.selectedLayerId : (snap.design.layers[0]?.id ?? null),
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    dirty: true,
  })
  last = snap
  lastChange = 0
  applying = false
}

export function undo() {
  const prev = past.pop()
  if (!prev || !last) return
  future.push(last)
  restore(prev)
}

export function redo() {
  const next = future.pop()
  if (!next || !last) return
  past.push(last)
  restore(next)
}

/** Replace the whole project (new / imported) without creating an undo step or marking it unsaved. */
export function resetHistory(fn: () => void) {
  silent = true
  applying = true
  fn()
  applying = false
  silent = false
  past.length = 0
  future.length = 0
  last = take(useStudio.getState())
  useStudio.setState({ canUndo: false, canRedo: false })
}
