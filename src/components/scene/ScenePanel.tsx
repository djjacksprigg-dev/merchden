import { Check } from 'lucide-react'
import { useStudio, type ExportBackground } from '../../state/studio'
import { SCENES, SCENE_MAP, sceneCss } from '../../three/scenes'

const ABOUT: Record<string, string> = {
  'studio-light': 'Clean product-photo look',
  'studio-dark': 'Dramatic dark backdrop',
  desk: 'On a gaming desk · clothing on a wall rail',
  arena: 'Spotlit esports stage',
  display: 'Shop table · clothing on hangers',
  exhibition: 'Your brand booth, plinth and rack',
  minimal: 'Soft, simple and calm',
  neon: 'Neon glow',
  retro: 'Retro sunset',
  pop: 'Bold pop-art colour',
}

/** Choose the setting the product is shown in (the 3D view and downloads). */
export function ScenePanel() {
  const scene = useStudio((s) => s.scene)
  const setScene = useStudio((s) => s.setScene)
  const bg = useStudio((s) => s.exportBackground)
  const setBg = useStudio((s) => s.setExportBackground)
  useStudio((s) => s.brandKit) // booth preview follows brand colours
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Background environment">
        {SCENES.map((sc) => {
          const active = scene === sc.id
          return (
            <button
              key={sc.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setScene(sc.id)}
              className={`group relative overflow-hidden rounded-xl border text-left transition focus-visible:outline-2 focus-visible:outline-accent ${active ? 'border-accent ring-2 ring-accent/50' : 'border-white/10 hover:border-white/30'}`}
            >
              <span className="block aspect-[4/3] w-full" style={{ background: sceneCss(sc) }} aria-hidden />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-black/0 px-2 pb-1.5 pt-5">
                <span className="block text-xs font-semibold text-white">{sc.label}</span>
                <span className="block text-[10px] leading-tight text-slate-300">{ABOUT[sc.id]}</span>
              </span>
              {active && (
                <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-navy-950">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div>
        <p className="field-label">Background in downloads</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Download background">
          {(
            [
              ['scene', `${SCENE_MAP[scene].label}`],
              ['brand', 'Team brand + logo'],
              ['black', 'Black'],
              ['white', 'White'],
              ['transparent', 'Product only'],
            ] as [ExportBackground, string][]
          ).map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={bg === id} className="chip" onClick={() => setBg(id)}>
              {label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">Desks, tables, rails and walls appear when downloads use the environment. Everything is drawn in your browser – no stock photos.</p>
      </div>
    </div>
  )
}
