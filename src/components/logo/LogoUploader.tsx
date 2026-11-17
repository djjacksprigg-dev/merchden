import { useRef, useState, type DragEvent } from 'react'
import { ImagePlus, LoaderCircle, RefreshCw, Sparkles, Trash2, TriangleAlert } from 'lucide-react'
import { useStudio } from '../../state/studio'
import { ACCEPT, LogoError, processLogoFile, svgToLogo } from '../../lib/logo'
import { SAMPLE_LOGOS } from '../../data/sampleLogos'

export function LogoUploader() {
  const addLogo = useStudio((s) => s.addLogo)
  const logos = useStudio((s) => s.logos)
  const activeLogoId = useStudio((s) => s.activeLogoId)
  const useLogo = useStudio((s) => s.useLogo)
  const removeLogo = useStudio((s) => s.removeLogo)
  const toast = useStudio((s) => s.toast)
  const input = useRef<HTMLInputElement>(null)
  const replaceInput = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const library = Object.values(logos).filter((l) => !l.hidden && l.purpose !== 'pattern').sort((a, b) => a.createdAt - b.createdAt)

  const handle = async (files: FileList | File[] | null, mode: 'add' | 'replace' = 'add') => {
    if (!files || !files.length) return
    setError(null)
    setBusy(true)
    try {
      const file = files[0]
      const logo = await processLogoFile(file)
      addLogo(logo, mode)
      toast(mode === 'replace' ? `Replaced logo with “${logo.name}”` : `Added “${logo.name}” – it's now on your product`, 'success')
      if (files.length > 1) toast('Only the first file was used. Upload logos one at a time.', 'info')
    } catch (e) {
      const msg = e instanceof LogoError ? e.message : 'Sorry, that file could not be processed. Try a PNG export of your logo.'
      setError(msg)
      if (!(e instanceof LogoError)) console.error(e)
    } finally {
      setBusy(false)
    }
  }

  const loadSample = async (i: number) => {
    setBusy(true)
    setError(null)
    try {
      const s = SAMPLE_LOGOS[i]
      addLogo(await svgToLogo(s.svg, s.name))
    } catch (e) {
      console.error(e)
      setError('The sample logo could not be created in this browser.')
    } finally {
      setBusy(false)
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDrag(false)
    handle(e.dataTransfer.files)
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`relative flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center transition-colors ${
          drag ? 'border-accent bg-accent-soft' : 'border-white/15 bg-navy-950/60 hover:border-white/30'
        }`}
      >
        {busy ? <LoaderCircle className="mb-2 h-6 w-6 animate-spin text-accent" aria-hidden /> : <ImagePlus className="mb-2 h-6 w-6 text-accent" aria-hidden />}
        <p className="text-sm font-medium text-white">{busy ? 'Processing image…' : 'Drag your logo or any image here'}</p>
        <p className="mt-0.5 text-xs text-slate-400">Team logos, sponsor logos, badges or artwork · PNG, JPG, WEBP or SVG · up to 10 MB · transparent backgrounds supported</p>
        <button type="button" className="btn-primary mt-3" onClick={() => input.current?.click()} disabled={busy}>
          Choose file
        </button>
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          aria-label="Upload logo file"
          onChange={(e) => {
            handle(e.target.files)
            e.target.value = ''
          }}
        />
        <input
          ref={replaceInput}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          aria-label="Replace logo file"
          tabIndex={-1}
          onChange={(e) => {
            handle(e.target.files, 'replace')
            e.target.value = ''
          }}
        />
      </div>

      {error && (
        <div role="alert" className="flex gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {library.length > 0 ? (
        <div>
          <p className="field-label">Your logos &amp; images – click to apply to the selected placement</p>
          <ul className="grid grid-cols-3 gap-2">
            {library.map((l) => (
              <li key={l.id} className="group relative">
                <button
                  type="button"
                  onClick={() => useLogo(l.id)}
                  className={`flex aspect-square w-full items-center justify-center rounded-lg border p-2 transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                    l.id === activeLogoId ? 'border-accent bg-accent-soft' : 'border-white/10 bg-[repeating-conic-gradient(#1b2640_0%_25%,#131c2e_0%_50%)] bg-[length:14px_14px] hover:border-white/30'
                  }`}
                  aria-pressed={l.id === activeLogoId}
                  aria-label={`Use logo ${l.name}`}
                  title={l.name}
                >
                  <img src={l.dataUrl} alt="" className="max-h-full max-w-full object-contain" draggable={false} />
                </button>
                <div className="absolute right-1 top-1 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                  {l.id === activeLogoId && (
                    <button type="button" className="rounded-md bg-navy-900/90 p-1 text-slate-200 hover:text-white" onClick={() => replaceInput.current?.click()} aria-label={`Replace ${l.name}`} title="Replace">
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  )}
                  <button type="button" className="rounded-md bg-navy-900/90 p-1 text-slate-200 hover:text-rose-300" onClick={() => removeLogo(l.id)} aria-label={`Remove ${l.name}`} title="Remove">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-lg border border-white/8 bg-navy-850 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden /> No logo yet? Try a sample brand
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SAMPLE_LOGOS.map((s, i) => (
              <button key={s.name} type="button" className="chip" onClick={() => loadSample(i)} disabled={busy}>
                {s.name.replace(' (sample)', '')}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Fictional sample teams made for this studio. Your own logos stay on this device.</p>
        </div>
      )}
    </div>
  )
}
