import { useRef, useState } from 'react'
import { ImagePlus, LoaderCircle, Trash2, TriangleAlert } from 'lucide-react'
import { useStudio } from '../../state/studio'
import { ACCEPT, LogoError, processLogoFile } from '../../lib/logo'

/** Students upload their own pattern or artwork to print over the whole product. */
export function CustomPattern() {
  const logos = useStudio((s) => s.logos)
  const design = useStudio((s) => s.design)
  const addPatternImage = useStudio((s) => s.addPatternImage)
  const useCustomPattern = useStudio((s) => s.useCustomPattern)
  const setMode = useStudio((s) => s.setCustomPatternMode)
  const toast = useStudio((s) => s.toast)
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const library = Object.values(logos)
    .filter((l) => l.purpose === 'pattern' && !l.hidden)
    .sort((a, b) => a.createdAt - b.createdAt)
  const active = design.pattern === 'custom'
  const mode = design.customPatternMode ?? 'tile'

  const handle = async (files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    setBusy(true)
    setError(null)
    try {
      const img = await processLogoFile(f)
      addPatternImage({ ...img, name: img.name || 'Pattern' })
      toast(`Printing “${img.name}” as your pattern`, 'success')
    } catch (e) {
      setError(e instanceof LogoError ? e.message : 'That image could not be used. Try a PNG or JPG.')
    } finally {
      setBusy(false)
    }
  }

  const remove = (id: string) => {
    useStudio.setState((s) => {
      const usedSaved = s.collection.some((d) => d.customPatternId === id)
      const next = { ...s.logos }
      if (usedSaved) next[id] = { ...next[id], hidden: true }
      else delete next[id]
      return { logos: next }
    })
    if (design.customPatternId === id) useStudio.getState().setPattern('solid')
  }

  return (
    <div className="mb-3">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Your own pattern</p>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          handle(e.dataTransfer.files)
        }}
        className={`flex items-center gap-3 rounded-xl border border-dashed p-3 transition-colors ${drag ? 'border-accent bg-accent-soft' : 'border-white/15 bg-navy-950/60'}`}
      >
        {busy ? <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-accent" aria-hidden /> : <ImagePlus className="h-5 w-5 shrink-0 text-accent" aria-hidden />}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-white">Upload a pattern or artwork</p>
          <p className="text-[11px] text-slate-400">Drawings, textures, photos – printed all over the product</p>
        </div>
        <button type="button" className="btn-secondary px-2.5 py-1.5 text-xs" onClick={() => input.current?.click()} disabled={busy}>
          Choose
        </button>
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          aria-label="Upload pattern image"
          onChange={(e) => {
            handle(e.target.files)
            e.target.value = ''
          }}
        />
      </div>
      {error && (
        <p role="alert" className="mt-2 flex gap-2 rounded-lg bg-rose-500/10 p-2 text-xs text-rose-200">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden /> {error}
        </p>
      )}
      {library.length > 0 && (
        <ul className="mt-2 grid grid-cols-4 gap-2" aria-label="Your patterns">
          {library.map((l) => {
            const on = active && design.customPatternId === l.id
            return (
              <li key={l.id} className="group relative">
                <button
                  type="button"
                  onClick={() => useCustomPattern(l.id)}
                  aria-pressed={on}
                  aria-label={`Use pattern ${l.name}`}
                  className={`block aspect-square w-full overflow-hidden rounded-lg border focus-visible:outline-2 focus-visible:outline-accent ${on ? 'border-accent ring-2 ring-accent/40' : 'border-white/10 hover:border-white/30'}`}
                  style={{ backgroundImage: `url(${l.dataUrl})`, backgroundSize: '50%', backgroundRepeat: 'repeat' }}
                />
                <button
                  type="button"
                  onClick={() => remove(l.id)}
                  className="absolute right-0.5 top-0.5 rounded bg-navy-900/90 p-0.5 text-slate-300 opacity-100 hover:text-rose-300 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                  aria-label={`Remove pattern ${l.name}`}
                >
                  <Trash2 className="h-3 w-3" aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {active && (
        <div className="mt-3">
          <p className="field-label">How to print it</p>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Pattern print style">
            <button type="button" role="radio" aria-checked={mode === 'tile'} className="chip" onClick={() => setMode('tile')}>
              Repeat (tile)
            </button>
            <button type="button" role="radio" aria-checked={mode === 'fill'} className="chip" onClick={() => setMode('fill')}>
              One big print
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            {mode === 'tile' ? 'Tip: a seamless (tileable) image gives the cleanest repeat. Use Pattern size to make tiles bigger or smaller.' : 'Your image is stretched over the whole print area, centred on the front.'}
          </p>
        </div>
      )}
    </div>
  )
}
