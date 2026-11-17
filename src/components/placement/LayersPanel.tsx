import { ArrowDown, ArrowUp, Copy, Lock, LockOpen, Trash2, Type } from 'lucide-react'
import { useStudio } from '../../state/studio'
import { Slider } from '../ui/controls'
import type { Zone } from '../../three/engine/types'

const NO_ZONES: Zone[] = []

/**
 * Every logo and text layer on the current product, top-most first.
 * Later layers print over earlier ones when they overlap.
 */
export function LayersPanel() {
  const layers = useStudio((s) => s.design.layers)
  const zones = useStudio((s) => (s.modelProductId === s.design.productId ? s.modelZones : NO_ZONES))
  const logos = useStudio((s) => s.logos)
  const selectedId = useStudio((s) => s.selectedLayerId)
  const select = useStudio((s) => s.selectLayer)
  const update = useStudio((s) => s.updateLayer)
  const remove = useStudio((s) => s.removeLayer)
  const duplicate = useStudio((s) => s.duplicateLayer)
  const move = useStudio((s) => s.moveLayer)
  const setTab = useStudio((s) => s.setRightTab)

  if (!layers.length) return <p className="text-sm text-slate-400">No layers yet. Upload a logo or add text and it will appear here.</p>
  const ordered = layers.map((l, i) => ({ l, i })).reverse()
  const selected = layers.find((l) => l.id === selectedId)

  return (
    <div className="space-y-3">
      <ul className="space-y-1" aria-label="Layers, top first">
        {ordered.map(({ l, i }) => {
          const zone = zones.find((z) => z.id === l.zoneId)
          const logo = l.logoId ? logos[l.logoId] : null
          const name = l.text ? `“${l.text.content || 'Text'}”` : (logo?.name ?? 'Empty logo slot')
          const active = l.id === selectedId
          return (
            <li key={l.id}>
              <div className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${active ? 'border-accent bg-accent-soft' : 'border-white/8 bg-navy-850'}`}>
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-accent"
                  onClick={() => {
                    select(l.id)
                    if (l.text) setTab('text')
                  }}
                  aria-pressed={active}
                  aria-label={`Select layer ${name} on ${zone?.label ?? l.zoneId}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-navy-950">
                    {l.text ? <Type className="h-3.5 w-3.5 text-slate-300" aria-hidden /> : logo ? <img src={logo.dataUrl} alt="" className="max-h-6 max-w-6 object-contain" /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-white">{name}</span>
                    <span className="block truncate text-[10px] text-slate-400">{zone?.label ?? l.zoneId}</span>
                  </span>
                </button>
                <div className="flex shrink-0 items-center">
                  <IconBtn label={l.locked ? `Unlock ${name}` : `Lock ${name}`} onClick={() => update(l.id, { locked: !l.locked })} pressed={!!l.locked}>
                    {l.locked ? <Lock className="h-3.5 w-3.5 text-accent" aria-hidden /> : <LockOpen className="h-3.5 w-3.5" aria-hidden />}
                  </IconBtn>
                  <IconBtn label={`Bring ${name} forward`} onClick={() => move(l.id, 1)} disabled={i === layers.length - 1}>
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                  </IconBtn>
                  <IconBtn label={`Send ${name} backward`} onClick={() => move(l.id, -1)} disabled={i === 0}>
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                  </IconBtn>
                  <IconBtn label={`Duplicate ${name}`} onClick={() => duplicate(l.id)}>
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  </IconBtn>
                  <IconBtn label={`Delete ${name}`} onClick={() => remove(l.id)} disabled={!!l.locked}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </IconBtn>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      {selected && (
        <Slider
          label="Opacity of selected layer"
          value={selected.opacity ?? 1}
          min={0.1}
          max={1}
          step={0.01}
          onChange={(v) => update(selected.id, { opacity: v })}
          format={(v) => `${Math.round(v * 100)}%`}
        />
      )}
      <p className="text-[11px] text-slate-500">Top of the list prints on top. Locked layers can’t be moved, resized or deleted until unlocked.</p>
    </div>
  )
}

function IconBtn({ label, onClick, disabled, pressed, children }: { label: string; onClick: () => void; disabled?: boolean; pressed?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="rounded p-1 text-slate-300 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-30 disabled:hover:bg-transparent"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
    >
      {children}
    </button>
  )
}
