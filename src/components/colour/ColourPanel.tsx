import { useMemo } from 'react'
import { RotateCcw } from 'lucide-react'
import { useLogoImage } from '../viewer/useLogoImage'
import { CustomPattern } from './CustomPattern'
import { drawPattern, PATTERNS } from '../../three/engine/patterns'
import { patternColorsOf } from '../../three/catalogue'
import { Slider } from '../ui/controls'
import { selectDef, useStudio } from '../../state/studio'
import { ColorField } from '../ui/controls'
import type { PatternId } from '../../lib/types'

function PatternThumb({ id, base, a, b, logo }: { id: PatternId; base: string; a: string; b: string; logo: HTMLImageElement | null }) {
  const src = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 88
    c.height = 60
    const ctx = c.getContext('2d')
    if (!ctx) return ''
    drawPattern(ctx, 88, 60, id, { base, a, b, logo }, 'flat', 60 / 0.4, 1)
    return c.toDataURL()
  }, [id, base, a, b, logo])
  return <img src={src} alt="" width={44} height={30} className="h-[30px] w-[44px] rounded border border-black/20" />
}

export function ColourPanel() {
  const def = useStudio(selectDef)
  const colors = useStudio((s) => s.design.colors)
  const pattern = useStudio((s) => s.design.pattern)
  const setColor = useStudio((s) => s.setColor)
  const setPattern = useStudio((s) => s.setPattern)
  const resetColors = useStudio((s) => s.resetColors)
  const patternScale = useStudio((s) => s.design.patternScale ?? 1)
  const setPatternScale = useStudio((s) => s.setPatternScale)
  const pc = patternColorsOf(def, colors)
  const base = colors.primary ?? def.defaults.primary
  const logoId = useStudio((s) => s.design.layers.find((l) => l.logoId)?.logoId ?? s.activeLogoId)
  const logoImg = useLogoImage(logoId ?? null)

  return (
    <div className="space-y-5">
      {def.patterns && (
        <div>
          <p className="field-label">Pattern</p>
          <CustomPattern />
          {(['esports', 'classic'] as const).map((group) => (
            <div key={group} className="mb-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{group === 'esports' ? 'Esports' : 'Classic'}</p>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={`${group === 'esports' ? 'Esports' : 'Classic'} patterns`}>
                {PATTERNS.filter((p) => p.group === group).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={pattern === p.id}
                    onClick={() => setPattern(p.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 text-center text-[11px] font-medium leading-tight transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                      pattern === p.id ? 'border-accent bg-accent-soft text-white' : 'border-white/10 bg-navy-850 text-slate-300 hover:border-white/25'
                    }`}
                  >
                    <PatternThumb id={p.id} base={base} a={pc.a} b={pc.b} logo={logoImg} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {pattern === 'logo-repeat' && !logoImg && <p className="mb-2 text-[11px] text-amber-300">Upload a logo in the Logo tab to see it repeated as a monogram.</p>}
          {pattern !== 'solid' && (
            <div className="mt-4 space-y-4">
              {!def.patternColors && pattern !== 'custom' && (
                <>
                  <ColorField label="Pattern colour" value={pc.a} onChange={(hex) => setColor('pattern', hex)} />
                  <ColorField label="Pattern highlight" value={pc.b} onChange={(hex) => setColor('pattern2', hex)} />
                </>
              )}
              <Slider label="Pattern size" value={patternScale} min={0.4} max={2.5} step={0.05} onChange={setPatternScale} format={(v) => `${Math.round(v * 100)}%`} />
            </div>
          )}
          <p className="mt-2 text-[11px] text-slate-500">
            Patterns are printed onto the 3D surface at real-world scale, so they follow folds and curves.{' '}
            {def.patternColors ? 'Pattern colours come from the pattern and trim colours below.' : ''}
          </p>
        </div>
      )}
      {def.colorSlots.map((slot) => (
        <ColorField key={slot.id} label={slot.label} value={colors[slot.id] ?? def.defaults[slot.id]} onChange={(hex) => setColor(slot.id, hex)} />
      ))}
      <button type="button" className="btn-secondary w-full" onClick={resetColors}>
        <RotateCcw className="h-4 w-4" aria-hidden /> Reset to original colours
      </button>
      <p className="text-[11px] text-slate-500">Your main and secondary colours become your brand colours and are applied automatically to new products you open.</p>
    </div>
  )
}
