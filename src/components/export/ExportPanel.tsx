import { useEffect, useState } from 'react'
import { Download, FileImage, Images, Layers, Save, CopyPlus } from 'lucide-react'
import { useStudio, type ExportBackground } from '../../state/studio'
import { downloadAllViews, downloadCurrent, saveToCollection } from '../../lib/exporter'
import { maxExportSize } from '../../three/renderService'
import { SCENES, SCENE_MAP } from '../../three/scenes'
import type { ViewName } from '../../lib/types'

const SIZES = [1024, 2048, 4096]

export function ExportPanel() {
  const [size, setSize] = useState(2048)
  const [max, setMax] = useState(4096)
  const bg = useStudio((s) => s.exportBackground)
  const setBg = useStudio((s) => s.setExportBackground)
  const scene = useStudio((s) => s.scene)
  const setScene = useStudio((s) => s.setScene)
  const isSaved = useStudio((s) => s.collection.some((c) => c.id === s.design.id))
  const busy = useStudio((s) => !!s.busy)
  useEffect(() => {
    const t = setTimeout(() => setMax(maxExportSize()), 500)
    return () => clearTimeout(t)
  }, [])

  const one = (view: ViewName | null, transparent = false) => downloadCurrent({ view, transparent, size })

  return (
    <div className="space-y-5">
      <div>
        <p className="field-label">Image size</p>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Image size">
          {SIZES.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={size === s} className="chip" disabled={s > max} onClick={() => setSize(s)} title={s > max ? 'Not supported by this graphics card' : undefined}>
              {s} px
            </button>
          ))}
        </div>
        {max < 4096 && <p className="mt-1.5 text-[11px] text-slate-500">This computer's graphics card supports up to {max} px.</p>}
      </div>
      <div>
        <p className="field-label">Look</p>
        <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Scene style">
          {SCENES.map((sc) => (
            <button
              key={sc.id}
              type="button"
              role="radio"
              aria-checked={scene === sc.id}
              onClick={() => setScene(sc.id)}
              className={`flex flex-col items-center gap-1 rounded-lg border p-1.5 text-[11px] font-medium text-slate-200 focus-visible:outline-2 focus-visible:outline-accent ${
                scene === sc.id ? 'border-accent bg-accent-soft' : 'border-white/10 bg-navy-850 hover:border-white/25'
              }`}
            >
              <span className="h-7 w-full rounded-md border border-white/15" style={{ background: sc.swatch }} aria-hidden />
              {sc.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">Changes the lighting and mood of the 3D view and your downloads.</p>
      </div>
      <div>
        <p className="field-label">Background</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Export background">
          {(
            [
              ['scene', `${SCENE_MAP[scene].label} scene`],
              ['brand', 'Team brand + logo'],
              ['black', 'Black'],
              ['white', 'White'],
              ['transparent', 'None (transparent)'],
            ] as [ExportBackground, string][]
          ).map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={bg === id} className="chip" onClick={() => setBg(id)}>
              {label}
            </button>
          ))}
        </div>
        {bg === 'brand' && <p className="mt-1.5 text-[11px] text-slate-500">Uses your team colours, a large faded logo and your logo + organisation name in the corner (set the name in Project).</p>}
      </div>

      <div className="space-y-2">
        <button type="button" className="btn-primary w-full justify-start" onClick={() => one(null)} disabled={busy}>
          <Download className="h-4 w-4" aria-hidden /> Download PNG (current view, chosen background)
        </button>
        <button type="button" className="btn-secondary w-full justify-start" onClick={() => one(null, true)} disabled={busy}>
          <FileImage className="h-4 w-4" aria-hidden /> Download transparent PNG
        </button>
        <button type="button" className="btn-secondary w-full justify-start" onClick={() => downloadAllViews({ transparent: false, size })} disabled={busy}>
          <Images className="h-4 w-4" aria-hidden /> Download all 4 product views (ZIP)
        </button>
      </div>

      <div>
        <p className="field-label">Single views</p>
        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              ['front', 'Front'],
              ['back', 'Back'],
              ['side', 'Side'],
              ['three-quarter', 'Three-quarter'],
            ] as [ViewName, string][]
          ).map(([v, label]) => (
            <div key={v} className="flex overflow-hidden rounded-lg border border-white/10">
              <button type="button" className="flex-1 bg-navy-800 px-2 py-1.5 text-xs font-medium text-slate-200 hover:bg-navy-700" onClick={() => one(v)} disabled={busy} aria-label={`Download ${label} view PNG`}>
                {label}
              </button>
              <button
                type="button"
                className="border-l border-white/10 bg-navy-800 px-2 text-[10px] font-semibold text-slate-400 hover:bg-navy-700 hover:text-white"
                onClick={() => one(v, true)}
                disabled={busy}
                aria-label={`Download ${label} view as transparent PNG`}
                title="Transparent"
              >
                <Layers className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">
          <Layers className="inline h-3 w-3" aria-hidden /> = transparent background. All exports are rendered from the 3D scene with no watermark.
        </p>
      </div>

      <div className="space-y-2 border-t border-white/6 pt-4">
        <p className="panel-title">Merchandise collection</p>
        <button type="button" className="btn-secondary w-full justify-start" onClick={() => saveToCollection(false)} disabled={busy}>
          <Save className="h-4 w-4" aria-hidden /> {isSaved ? 'Update in My designs' : 'Save to My designs'}
        </button>
        {isSaved && (
          <button type="button" className="btn-ghost w-full justify-start" onClick={() => saveToCollection(true)} disabled={busy}>
            <CopyPlus className="h-4 w-4" aria-hidden /> Save as a new copy
          </button>
        )}
        <button type="button" className="btn-ghost w-full justify-start" onClick={() => useStudio.getState().setCollectionOpen(true)}>
          Open My designs for ZIP and presentation sheet downloads →
        </button>
      </div>
    </div>
  )
}
