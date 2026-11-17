import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignStartHorizontal, AlignStartVertical, Copy, Crosshair, ImageOff, Lock, Magnet, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { selectDef, useStudio } from '../../state/studio'
import { Slider } from '../ui/controls'
import type { LogoLayer } from '../../lib/types'
import type { Zone } from '../../three/engine/types'

const NO_ZONES: Zone[] = []

export function PlacementPanel() {
  const design = useStudio((s) => s.design)
  const zones = useStudio((s) => (s.modelProductId === s.design.productId ? s.modelZones : NO_ZONES))
  const selectedId = useStudio((s) => s.selectedLayerId)
  const selectLayer = useStudio((s) => s.selectLayer)
  const addLayer = useStudio((s) => s.addLayer)
  const removeLayer = useStudio((s) => s.removeLayer)
  const updateLayer = useStudio((s) => s.updateLayer)
  const logos = useStudio((s) => s.logos)
  const def = useStudio(selectDef)

  if (!zones.length) return <p className="text-sm text-slate-400">Loading placement areas…</p>
  const imageLayers = design.layers.filter((l) => !l.text)
  const layer = imageLayers.find((l) => l.id === selectedId) ?? imageLayers[0]
  const zone = layer ? zones.find((z) => z.id === layer.zoneId) : undefined
  const isSticker = def.id === 'sticker'
  const usedZones = new Set(imageLayers.map((l) => l.zoneId))

  return (
    <div className="space-y-4">
      <div>
        <p className="field-label">Placement areas on the {def.shortName.toLowerCase()}</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Placement areas">
          {zones.map((z) => {
            const inZone = imageLayers.filter((x) => x.zoneId === z.id)
            const l = inZone.find((x) => x.id === layer?.id) ?? inZone[0]
            const active = !!l && l.id === layer?.id
            return (
              <button
                key={z.id}
                type="button"
                className="chip"
                data-active={active}
                aria-pressed={active}
                onClick={() => (l ? selectLayer(l.id) : addLayer(z.id))}
                title={l ? `Edit logo on ${z.label}` : `Add a logo to ${z.label}`}
              >
                {!l && <Plus className="h-3 w-3" aria-hidden />}
                {l && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />}
                {z.label}
                {inZone.length > 1 && <span className="text-[10px] text-slate-400">×{inZone.length}</span>}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          {usedZones.size > 0 ? 'A dot means a logo is placed there. ' : ''}Only areas this product genuinely supports are shown.
        </p>
      </div>

      {layer && zone ? (
        <>
          {!isSticker && (zone.kind === 'planar' || zone.kind === 'wrap') && (
            <button type="button" className="btn-ghost w-full justify-start text-xs" onClick={() => addLayer(zone.id)}>
              <Plus className="h-3.5 w-3.5" aria-hidden /> Add another logo to {zone.label}
            </button>
          )}
          <LayerEditor layer={layer} zone={zone} isSticker={isSticker} hasLogo={!!(layer.logoId && logos[layer.logoId])} onRemove={() => removeLayer(layer.id)} onChange={(p) => updateLayer(layer.id, p)} zones={zones} />
        </>
      ) : (
        <p className="rounded-lg border border-white/8 bg-navy-850 p-3 text-sm text-slate-400">Choose a placement area above to add your logo.</p>
      )}
    </div>
  )
}

export function LayerEditor({
  layer,
  zone,
  zones,
  isSticker,
  hasLogo,
  onChange,
  onRemove,
}: {
  layer: LogoLayer
  zone: Zone
  zones: Zone[]
  isSticker: boolean
  hasLogo: boolean
  onChange: (p: Partial<LogoLayer>) => void
  onRemove: () => void
}) {
  const resetLayerPosition = useStudio((s) => s.resetLayerPosition)
  const duplicateLayer = useStudio((s) => s.duplicateLayer)
  const design = useStudio((s) => s.design)
  const [snap, setSnap] = useState(true)
  const locked = !!layer.locked
  const setStickerShape = useStudio((s) => s.setStickerShape)
  const movable = zone.kind === 'planar' || zone.kind === 'wrap'
  const otherZones = zones.filter((z) => z.id !== zone.id && (z.kind === 'planar' || z.kind === 'wrap'))

  return (
    <div className="space-y-4 rounded-xl border border-white/8 bg-navy-850 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">{zone.label}</p>
        <div className="flex">
          {!isSticker && (
            <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => duplicateLayer(layer.id)} aria-label="Duplicate this layer">
              <Copy className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
          <button type="button" className="btn-ghost px-2 py-1 text-xs" disabled={locked} onClick={() => resetLayerPosition(layer.id)} aria-label="Reset logo position">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset
          </button>
          {!isSticker && (
            <button type="button" className="btn-danger px-2 py-1 text-xs" disabled={locked} onClick={onRemove} aria-label={layer.text ? `Remove this text` : `Remove logo from ${zone.label}`}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
            </button>
          )}
        </div>
      </div>

      {locked && (
        <button type="button" className="flex w-full items-center gap-2 rounded-lg bg-accent-soft p-2 text-left text-xs text-orange-100" onClick={() => onChange({ locked: false })}>
          <Lock className="h-4 w-4 shrink-0 text-accent" aria-hidden /> This layer is locked. Click to unlock and edit it.
        </button>
      )}

      {!hasLogo && !layer.text && (
        <p className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-200">
          <ImageOff className="h-4 w-4 shrink-0" aria-hidden /> No logo on this area yet – upload one or pick one from your logos.
        </p>
      )}

      {isSticker && (
        <div>
          <p className="field-label">Sticker shape</p>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Sticker shape">
            {(
              [
                ['die-cut', 'Die-cut'],
                ['circle', 'Circle'],
                ['rounded-square', 'Rounded square'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" role="radio" aria-checked={design.stickerShape === id} className="chip" onClick={() => setStickerShape(id)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <fieldset disabled={locked} className="space-y-4 disabled:opacity-50">
      {movable && <PositionPad layer={layer} onChange={onChange} snap={snap} />}
      {movable && (
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Align within placement area">
          <AlignBtn label="Align left" onClick={() => onChange({ offsetX: -1 })} icon={AlignStartVertical} />
          <AlignBtn label="Centre horizontally" onClick={() => onChange({ offsetX: 0 })} icon={AlignCenterVertical} />
          <AlignBtn label="Align right" onClick={() => onChange({ offsetX: 1 })} icon={AlignEndVertical} />
          <AlignBtn label="Align top" onClick={() => onChange({ offsetY: 1 })} icon={AlignStartHorizontal} />
          <AlignBtn label="Centre vertically" onClick={() => onChange({ offsetY: 0 })} icon={AlignCenterHorizontal} />
          <AlignBtn label="Align bottom" onClick={() => onChange({ offsetY: -1 })} icon={AlignEndHorizontal} />
          <button type="button" className="chip ml-auto px-2 py-1 text-[11px]" onClick={() => onChange({ offsetX: 0, offsetY: 0 })}>
            <Crosshair className="h-3 w-3" aria-hidden /> Centre
          </button>
          <button type="button" className="chip px-2 py-1 text-[11px]" data-active={snap} aria-pressed={snap} onClick={() => setSnap(!snap)} title="Snap to centre and edge guides when dragging">
            <Magnet className="h-3 w-3" aria-hidden /> Snap
          </button>
        </div>
      )}

      {movable && (
        <div className="grid grid-cols-2 gap-3">
          <Slider label="Horizontal" value={layer.offsetX} min={-1} max={1} step={0.01} onChange={(v) => onChange({ offsetX: v })} format={(v) => `${Math.round(v * 100)}`} />
          <Slider label="Vertical" value={layer.offsetY} min={-1} max={1} step={0.01} onChange={(v) => onChange({ offsetY: v })} format={(v) => `${Math.round(v * 100)}`} />
        </div>
      )}
      <Slider
        label={zone.kind === 'repeat' ? 'Logo size on strap' : 'Size'}
        value={layer.scale}
        min={0.3}
        max={zone.kind === 'sticker' ? 1 : Math.max(1.2, zone.maxSize / zone.size)}
        step={0.01}
        onChange={(v) => onChange({ scale: v })}
        format={(v) => `${Math.round(v * 100)}%`}
      />
      <Slider label="Rotation" value={layer.rotation} min={-180} max={180} step={1} onChange={(v) => onChange({ rotation: v })} format={(v) => `${Math.round(v)}°`} />
      <div className="flex flex-wrap gap-1.5">
        {[-90, -45, 0, 45, 90, 180].map((r) => (
          <button key={r} type="button" className="chip px-2 py-1" data-active={Math.round(layer.rotation) === r} onClick={() => onChange({ rotation: r })} aria-label={`Rotate to ${r} degrees`}>
            {r}°
          </button>
        ))}
      </div>

      {otherZones.length > 0 && !isSticker && (
        <div>
          <label className="field-label" htmlFor="move-zone">
            Move to another area
          </label>
          <select id="move-zone" className="input" value="" onChange={(e) => e.target.value && onChange({ zoneId: e.target.value, offsetX: 0, offsetY: 0 })}>
            <option value="">Choose area…</option>
            {otherZones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.label}
              </option>
            ))}
          </select>
        </div>
      )}
      </fieldset>
    </div>
  )
}

function AlignBtn({ label, onClick, icon: Icon }: { label: string; onClick: () => void; icon: typeof Crosshair }) {
  return (
    <button type="button" className="rounded p-1.5 text-slate-300 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-accent" onClick={onClick} aria-label={label} title={label}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </button>
  )
}

/** Pulls a value onto the nearest guide (edges, quarter lines, centre) when close. */
export function snapValue(v: number, on: boolean) {
  if (!on) return v
  for (const g of [-1, -0.5, 0, 0.5, 1]) if (Math.abs(v - g) < 0.06) return g
  return v
}

/** 2D pad for dragging the logo within its placement area (also keyboard operable). */
function PositionPad({ layer, onChange, snap }: { layer: LogoLayer; onChange: (p: Partial<LogoLayer>) => void; snap: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const set = (e: PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 2 - 1
    const y = -(((e.clientY - r.top) / r.height) * 2 - 1)
    onChange({ offsetX: snapValue(Math.max(-1, Math.min(1, x)), snap), offsetY: snapValue(Math.max(-1, Math.min(1, y)), snap) })
  }
  const onKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.03
    const m: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }
    const d = m[e.key]
    if (!d) return
    e.preventDefault()
    onChange({ offsetX: Math.max(-1, Math.min(1, layer.offsetX + d[0])), offsetY: Math.max(-1, Math.min(1, layer.offsetY + d[1])) })
  }
  return (
    <div>
      <p className="field-label flex items-center gap-1.5">
        <Crosshair className="h-3.5 w-3.5" aria-hidden /> Drag to position (or use arrow keys)
      </p>
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label="Logo position within placement area"
        aria-valuetext={`Horizontal ${Math.round(layer.offsetX * 100)}, vertical ${Math.round(layer.offsetY * 100)}`}
        aria-valuenow={Math.round(layer.offsetX * 100)}
        aria-valuemin={-100}
        aria-valuemax={100}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
          set(e)
        }}
        onPointerMove={(e) => e.buttons && set(e)}
        className="relative h-28 w-full cursor-crosshair touch-none rounded-lg border border-white/10 bg-navy-950 focus-visible:outline-2 focus-visible:outline-accent"
        style={{ backgroundImage: 'linear-gradient(#ffffff0d 1px, transparent 1px), linear-gradient(90deg, #ffffff0d 1px, transparent 1px)', backgroundSize: '12.5% 25%' }}
      >
        <span className={`absolute left-1/2 top-0 h-full w-px ${snap && layer.offsetX === 0 ? 'bg-accent' : 'bg-white/10'}`} aria-hidden />
        <span className={`absolute left-0 top-1/2 h-px w-full ${snap && layer.offsetY === 0 ? 'bg-accent' : 'bg-white/10'}`} aria-hidden />
        <span
          className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent shadow-lg"
          style={{ left: `${(layer.offsetX + 1) * 50}%`, top: `${(1 - layer.offsetY) * 50}%`, transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)` }}
          aria-hidden
        />
      </div>
    </div>
  )
}
