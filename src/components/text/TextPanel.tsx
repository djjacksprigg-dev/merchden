import { useId } from 'react'
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Plus, Type } from 'lucide-react'
import { selectDef, useStudio } from '../../state/studio'
import { ColorField, Slider } from '../ui/controls'
import { FONTS, FONT_MAP } from '../../three/engine/text'
import { LayerEditor } from '../placement/PlacementPanel'
import type { Zone } from '../../three/engine/types'
import type { LogoLayer } from '../../lib/types'

const NO_ZONES: Zone[] = []

/**
 * Chooses where a preset goes: a matching area that has nothing on it yet,
 * else any empty area, else the matching area (the caller then offsets the
 * text so it sits clear of the logo).
 */
function pickZone(zones: Zone[], prefer: RegExp, fallback: string, occupied: Set<string> = new Set()) {
  const usable = zones.filter((z) => z.kind === 'planar' || z.kind === 'wrap')
  const free = (z: Zone) => !occupied.has(z.id)
  const z =
    usable.find((x) => prefer.test(x.id) && free(x)) ??
    usable.find((x) => prefer.test(x.label.toLowerCase()) && free(x)) ??
    usable.find(free) ??
    usable.find((x) => prefer.test(x.id)) ??
    usable.find((x) => x.id === fallback) ??
    usable[0]
  return z ? { id: z.id, busy: occupied.has(z.id) } : null
}

export function TextPanel() {
  const design = useStudio((s) => s.design)
  const zones = useStudio((s) => (s.modelProductId === s.design.productId ? s.modelZones : NO_ZONES))
  const selectedId = useStudio((s) => s.selectedLayerId)
  const selectLayer = useStudio((s) => s.selectLayer)
  const addTextLayer = useStudio((s) => s.addTextLayer)
  const updateText = useStudio((s) => s.updateText)
  const updateLayer = useStudio((s) => s.updateLayer)
  const removeLayer = useStudio((s) => s.removeLayer)
  const orgName = useStudio((s) => s.project.orgName)
  const def = useStudio(selectDef)

  const textLayers = design.layers.filter((l) => l.text)
  const layer = textLayers.find((l) => l.id === selectedId) ?? textLayers[textLayers.length - 1]
  const zone = layer ? zones.find((z) => z.id === layer.zoneId) : undefined
  const usable = zones.filter((z) => z.kind === 'planar' || z.kind === 'wrap')

  if (!zones.length) return <p className="text-sm text-slate-400">Loading placement areas…</p>
  if (!usable.length)
    return <p className="rounded-lg border border-white/8 bg-navy-850 p-3 text-sm text-slate-400">Text isn't available on the {def.shortName.toLowerCase()} – its print is made from your logo. Try the logo tab instead.</p>

  const team = (orgName || 'TEAM NAME').toUpperCase()
  const occupied = new Set(design.layers.map((l) => l.zoneId))
  const presets: { label: string; run: () => void }[] = [
    {
      label: 'Team name',
      run: () => {
        const z = pickZone(zones, /centre|center|front|pocket|card|plate|backrest|surface|reverse|back/, def.defaultZone, occupied)
        if (z) addTextLayer(z.id, { content: team, font: 'orbitron' }, z.busy ? { offsetY: -1, scale: 0.7 } : { scale: 1 })
      },
    },
    {
      label: 'Gamer tag + number',
      run: () => {
        const z = pickZone(zones, /^back$|rear|reverse|back/, def.defaultZone, occupied)
        if (!z) return
        addTextLayer(z.id, { content: 'GAMERTAG', font: 'russo' }, { offsetY: 0.75, scale: 0.85 })
        addTextLayer(z.id, { content: '07', font: 'russo', outline: 0.06, outlineColor: '#ff7a1a' }, { offsetY: 0.05, scale: 0.75 })
      },
    },
    {
      label: 'Slogan',
      run: () => {
        const z = pickZone(zones, /sleeve|side|thigh|hip|lower|corner|reverse|back/, def.defaultZone, occupied)
        if (z) addTextLayer(z.id, { content: 'GG WP', font: 'press-start' }, z.busy ? { offsetY: -1, scale: 0.6 } : { scale: 0.8 })
      },
    },
    {
      label: 'Curved crest text',
      run: () => {
        const z = pickZone(zones, /centre|center|front|reverse|back/, def.defaultZone, occupied)
        if (z) addTextLayer(z.id, { content: team, font: 'black-ops', arc: 60 }, z.busy ? { offsetY: 1, scale: 0.75 } : { offsetY: 0.3 })
      },
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <p className="field-label">Quick start</p>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button key={p.label} type="button" className="chip" onClick={p.run}>
              <Plus className="h-3 w-3" aria-hidden /> {p.label}
            </button>
          ))}
        </div>
      </div>

      {textLayers.length > 0 && (
        <div>
          <p className="field-label">Text on this {def.shortName.toLowerCase()}</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Text items">
            {textLayers.map((l) => (
              <button key={l.id} type="button" className="chip max-w-full" data-active={l.id === layer?.id} aria-pressed={l.id === layer?.id} onClick={() => selectLayer(l.id)}>
                <Type className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{l.text!.content || '(empty)'}</span>
              </button>
            ))}
            <button type="button" className="chip" onClick={() => {
                const z = pickZone(zones, /centre|front|back/, def.defaultZone, occupied)
                if (z) addTextLayer(z.id, { content: 'TEXT' }, z.busy ? { offsetY: -1, scale: 0.7 } : {})
              }}>
              <Plus className="h-3 w-3" aria-hidden /> Add text
            </button>
          </div>
        </div>
      )}

      {!textLayers.length && (
        <button type="button" className="btn-primary w-full" onClick={() => {
            const z = pickZone(zones, /centre|front|back/, def.defaultZone, occupied)
            if (z) addTextLayer(z.id, { content: team }, z.busy ? { offsetY: -1, scale: 0.7 } : {})
          }}>
          <Type className="h-4 w-4" aria-hidden /> Add text
        </button>
      )}

      {layer && layer.text && zone && <TextEditor layer={layer} onText={(p) => updateText(layer.id, p)} />}
      {layer && zone && (
        <LayerEditor
          layer={layer}
          zone={zone}
          zones={zones}
          isSticker={false}
          hasLogo
          onChange={(p) => updateLayer(layer.id, p)}
          onRemove={() => removeLayer(layer.id)}
        />
      )}
      <p className="text-[11px] text-slate-500">Text is printed onto the product surface like your logo – drag it on the product, use the position pad, or double-click the product.</p>
    </div>
  )
}

function TextEditor({ layer, onText }: { layer: LogoLayer; onText: (p: Partial<NonNullable<LogoLayer['text']>>) => void }) {
  const t = layer.text!
  const id = useId()
  const font = FONT_MAP[t.font]
  return (
    <div className="space-y-4 rounded-xl border border-white/8 bg-navy-850 p-3">
      <div>
        <label htmlFor={`${id}-c`} className="field-label">
          Text
        </label>
        <input id={`${id}-c`} className="input" value={t.content} maxLength={32} onChange={(e) => onText({ content: e.target.value })} placeholder="Team name, gamer tag, number…" />
        {font?.caps && t.content !== t.content.toUpperCase() && <p className="mt-1 text-[11px] text-slate-500">{font.label} is an all-capitals font.</p>}
      </div>
      <div>
        <label htmlFor={`${id}-s`} className="field-label">
          Second line (optional, smaller)
        </label>
        <input id={`${id}-s`} className="input" value={t.subline ?? ''} maxLength={32} onChange={(e) => onText({ subline: e.target.value })} placeholder="e.g. EST. 2026 · CAPTAIN · #07" />
      </div>
      <div>
        <p className="field-label">Font</p>
        <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Font">
          {FONTS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={t.font === f.id}
              onClick={() => onText({ font: f.id })}
              className={`truncate rounded-lg border px-2 py-2 text-left text-sm text-white transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                t.font === f.id ? 'border-accent bg-accent-soft' : 'border-white/10 bg-navy-900 hover:border-white/25'
              }`}
              style={{ fontFamily: f.family, fontWeight: f.weight, fontSize: f.id === 'press-start' ? 10 : 15 }}
              aria-label={f.label}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className="chip px-2" aria-pressed={!!t.bold} onClick={() => onText({ bold: !t.bold })} aria-label="Bold" title="Bold">
          <Bold className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button type="button" className="chip px-2" aria-pressed={!!t.italic} onClick={() => onText({ italic: !t.italic })} aria-label="Italic" title="Italic">
          <Italic className="h-3.5 w-3.5" aria-hidden />
        </button>
        <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />
        <div className="flex gap-1.5" role="radiogroup" aria-label="Line alignment">
          {(
            [
              ['left', AlignLeft, 'Align lines left'],
              ['center', AlignCenter, 'Centre lines'],
              ['right', AlignRight, 'Align lines right'],
            ] as const
          ).map(([a, Icon, label]) => (
            <button key={a} type="button" role="radio" className="chip px-2" aria-checked={(t.align ?? 'center') === a} onClick={() => onText({ align: a })} aria-label={label} title={label}>
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </button>
          ))}
        </div>
      </div>
      <ColorField label="Text colour" value={t.color} onChange={(hex) => onText({ color: hex })} />
      <Slider label="Outline" value={t.outline} min={0} max={0.16} step={0.005} onChange={(v) => onText({ outline: v })} format={(v) => (v === 0 ? 'None' : `${Math.round(v * 100)}`)} />
      {t.outline > 0 && <ColorField label="Outline colour" value={t.outlineColor} onChange={(hex) => onText({ outlineColor: hex })} />}
      <Slider label="Letter spacing" value={t.spacing} min={-0.05} max={0.5} step={0.01} onChange={(v) => onText({ spacing: v })} format={(v) => `${Math.round(v * 100)}`} />
      <Slider label="Curve" value={t.arc} min={-120} max={120} step={1} onChange={(v) => onText({ arc: v })} format={(v) => (v === 0 ? 'Straight' : v > 0 ? `Arch ${Math.round(v)}°` : `Smile ${Math.round(-v)}°`)} />
    </div>
  )
}
