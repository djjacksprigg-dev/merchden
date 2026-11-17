import { useEffect, useState } from 'react'
import { Download, FileImage, Images, Layers, Save, CopyPlus, Columns2 } from 'lucide-react'
import { useStudio, type ExportBackground } from '../../state/studio'
import { downloadAllViews, downloadCurrent, downloadFrontBack, EXPORT_SIZES, saveToCollection, viewsFor, type ExportFormat, type ExportSpec } from '../../lib/exporter'
import { PRODUCT_MAP } from '../../three/catalogue'
import { maxExportSize } from '../../three/renderService'
import { SCENES, SCENE_MAP } from '../../three/scenes'
import type { ViewName } from '../../lib/types'


export function ExportPanel() {
  const sizeId = useStudio((s) => s.exportSize)
  const format = useStudio((s) => s.exportFormat)
  const setSizeId = (exportSize: string) => useStudio.setState({ exportSize })
  const setFormat = (exportFormat: ExportFormat) => useStudio.setState({ exportFormat })
  const [max, setMax] = useState(4096)
  const size = EXPORT_SIZES.find((x) => x.id === sizeId) ?? EXPORT_SIZES[0]
  const spec: ExportSpec = { w: size.w, h: size.h, format }
  const def = useStudio((s) => PRODUCT_MAP[s.design.productId])
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

  const one = (view: ViewName | null, transparent = false) => downloadCurrent({ view, transparent, spec: transparent ? { ...spec, format: 'png' } : spec })

  return (
    <div className="space-y-5">
      <div>
        <p className="field-label">Image size</p>
        <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Image size">
          {EXPORT_SIZES.map((x) => {
            const tooBig = Math.min(x.w, x.h) > max
            return (
              <button key={x.id} type="button" role="radio" aria-checked={sizeId === x.id} className="chip justify-center" onClick={() => setSizeId(x.id)} title={tooBig ? `This computer renders up to ${max} px – the image is scaled to fit` : undefined}>
                {x.label}
              </button>
            )
          })}
        </div>
        <p className="field-label mt-3">Format</p>
        <div className="flex gap-1.5" role="radiogroup" aria-label="File format">
          {(['png', 'jpg'] as ExportFormat[]).map((f) => (
            <button key={f} type="button" role="radio" aria-checked={format === f} className="chip" onClick={() => setFormat(f)}>
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">PNG keeps full quality and supports transparency. JPG files are smaller (white is used where the background would be transparent). Images are never stretched – the product is framed to fit and the background fills the frame.</p>
      </div>
      <div>
        <p className="field-label">Mockup environment</p>
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
        <p className="mt-1.5 text-[11px] text-slate-500">Sets the lighting and setting of the 3D view and your downloads. All environments are drawn locally – no stock photos.</p>
      </div>
      <div>
        <p className="field-label">Background</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Export background">
          {(
            [
              ['scene', `${SCENE_MAP[scene].label} environment`],
              ['brand', 'Team brand + logo'],
              ['black', 'Black'],
              ['white', 'White'],
              ['transparent', 'Product only (transparent)'],
            ] as [ExportBackground, string][]
          ).map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={bg === id} className="chip" onClick={() => setBg(id)}>
              {label}
            </button>
          ))}
        </div>
        {bg === 'brand' && <p className="mt-1.5 text-[11px] text-slate-500">Uses your team colours, a large faded logo and your logo + organisation name in the corner (set the name in Brand Kit).</p>}
      </div>

      <div className="space-y-2">
        <button type="button" className="btn-primary w-full justify-start" onClick={() => one(null)} disabled={busy}>
          <Download className="h-4 w-4" aria-hidden /> Download {format.toUpperCase()} (current view)
        </button>
        <button type="button" className="btn-secondary w-full justify-start" onClick={() => downloadFrontBack({ transparent: false, spec })} disabled={busy}>
          <Columns2 className="h-4 w-4" aria-hidden /> Front + back together ({format.toUpperCase()})
        </button>
        <button type="button" className="btn-secondary w-full justify-start" onClick={() => one(null, true)} disabled={busy}>
          <FileImage className="h-4 w-4" aria-hidden /> Download transparent PNG
        </button>
        <button type="button" className="btn-secondary w-full justify-start" onClick={() => downloadAllViews({ transparent: false, spec })} disabled={busy}>
          <Images className="h-4 w-4" aria-hidden /> Download all {viewsFor(def.id).length} views (ZIP)
        </button>
      </div>

      <div>
        <p className="field-label">Single views</p>
        <div className="grid grid-cols-2 gap-1.5">
          {viewsFor(def.id)
            .map((v): [ViewName, string] => [v, v === 'front' ? 'Front' : v === 'back' ? 'Back' : v === 'three-quarter' ? 'Three-quarter' : v === 'side' ? (def.sideLabel ?? def.sideLabels?.[0] ?? 'Left') : (def.sideLabels?.[1] ?? 'Right')])
            .map(([v, label]) => (
            <div key={v} className="flex overflow-hidden rounded-lg border border-white/10">
              <button type="button" className="flex-1 bg-navy-800 px-2 py-1.5 text-xs font-medium text-slate-200 hover:bg-navy-700" onClick={() => one(v)} disabled={busy} aria-label={`Download ${label} view ${format.toUpperCase()}`}>
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
          <Save className="h-4 w-4" aria-hidden /> {isSaved ? 'Update in My collection' : 'Add to My collection'}
        </button>
        {isSaved && (
          <button type="button" className="btn-ghost w-full justify-start" onClick={() => saveToCollection(true)} disabled={busy}>
            <CopyPlus className="h-4 w-4" aria-hidden /> Save as a new copy
          </button>
        )}
        <button type="button" className="btn-ghost w-full justify-start" onClick={() => useStudio.getState().setCollectionOpen(true)}>
          Open My collection for ZIP and collection board downloads →
        </button>
      </div>
    </div>
  )
}
