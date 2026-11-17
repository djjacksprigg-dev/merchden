import { useId } from 'react'
import { Hash, Megaphone, Shield, Shirt, Trash2, User } from 'lucide-react'
import { useStudio } from '../../state/studio'
import type { LayerRole, LogoLayer, TextStyle } from '../../lib/types'
import type { Zone } from '../../three/engine/types'

const NO_ZONES: Zone[] = []

/** First zone that exists on this product, in order of preference. */
function zoneFor(zones: Zone[], ids: string[]) {
  for (const id of ids) {
    const z = zones.find((x) => x.id === id)
    if (z) return z
  }
  return null
}

const PLACES: Record<LayerRole, string[]> = {
  'team-logo': ['front-chest', 'left-chest', 'centre-chest', 'centre-front'],
  sponsor: ['centre-front', 'full-front', 'right-chest', 'centre-chest'],
  'player-name': ['upper-back', 'back'],
  'player-number': ['back'],
  'front-number': ['right-chest', 'front-chest'],
  'sleeve-left': ['left-sleeve'],
  'sleeve-right': ['right-sleeve'],
  slogan: ['back', 'upper-back'],
}

/**
 * Jersey / kit branding: team logo, sponsor, player name and number, sleeve
 * branding and slogan – each kept as a normal, fully editable layer tagged
 * with its role so it can be updated in one place.
 */
export function KitBuilder() {
  const zones = useStudio((s) => (s.modelProductId === s.design.productId ? s.modelZones : NO_ZONES))
  const layers = useStudio((s) => s.design.layers)
  const kit = useStudio((s) => s.brandKit)
  const activeLogo = useStudio((s) => s.activeLogoId)
  const logos = useStudio((s) => s.logos)
  const addLayer = useStudio((s) => s.addLayer)
  const addTextLayer = useStudio((s) => s.addTextLayer)
  const updateLayer = useStudio((s) => s.updateLayer)
  const updateText = useStudio((s) => s.updateText)
  const removeLayer = useStudio((s) => s.removeLayer)
  const selectLayer = useStudio((s) => s.selectLayer)
  const toast = useStudio((s) => s.toast)
  const nameId = useId()
  const numId = useId()
  const sloganId = useId()

  const byRole = (r: LayerRole) => layers.find((l) => l.role === r)
  const usable = (r: LayerRole) => !!zoneFor(zones, PLACES[r])
  const primaryLogo = (kit.primaryLogoId && logos[kit.primaryLogoId] ? kit.primaryLogoId : null) ?? activeLogo
  const secondaryLogo = kit.secondaryLogoId && logos[kit.secondaryLogoId] ? kit.secondaryLogoId : null

  const placeLogo = (r: LayerRole, logoId: string | null, place: Partial<LogoLayer> = {}) => {
    const z = zoneFor(zones, PLACES[r])
    if (!z) return
    if (!logoId) {
      toast(r === 'sponsor' ? 'Choose a secondary (sponsor) logo in the Brand Kit tab first.' : 'Upload a logo or set your primary logo in the Brand Kit first.', 'info')
      return
    }
    const existing = byRole(r)
    if (existing) {
      updateLayer(existing.id, { logoId })
      selectLayer(existing.id)
      return
    }
    addLayer(z.id, logoId)
    const id = useStudio.getState().selectedLayerId
    if (id) updateLayer(id, { role: r, ...place })
  }

  const setText = (r: LayerRole, content: string, style: Partial<TextStyle>, place: Partial<LogoLayer>) => {
    const existing = byRole(r)
    if (existing) {
      if (!content.trim()) {
        removeLayer(existing.id)
        return
      }
      updateText(existing.id, { content })
      return
    }
    if (!content.trim()) return
    const z = zoneFor(zones, PLACES[r])
    if (!z) return
    const id = addTextLayer(z.id, { content, font: kit.font, ...style }, { ...place, role: r })
    selectLayer(id)
  }

  const nameL = byRole('player-name')
  const numL = byRole('player-number')
  const sloganL = byRole('slogan')
  const backIsUpper = !!zoneFor(zones, ['upper-back'])

  if (!usable('team-logo') && !usable('player-number')) return null

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">Build a full team kit. Each item becomes a normal layer you can still move, resize and style.</p>
      <div className="grid grid-cols-2 gap-1.5">
        {usable('team-logo') && (
          <button type="button" className="chip justify-center" data-active={!!byRole('team-logo')} onClick={() => placeLogo('team-logo', primaryLogo)}>
            <Shield className="h-3.5 w-3.5" aria-hidden /> Team logo
          </button>
        )}
        {usable('sponsor') && (
          <button type="button" className="chip justify-center" data-active={!!byRole('sponsor')} onClick={() => placeLogo('sponsor', secondaryLogo, { scale: 1.1 })}>
            <Megaphone className="h-3.5 w-3.5" aria-hidden /> Sponsor logo
          </button>
        )}
        {usable('sleeve-left') && (
          <button
            type="button"
            className="chip justify-center"
            data-active={!!byRole('sleeve-left')}
            onClick={() => {
              placeLogo('sleeve-left', secondaryLogo ?? primaryLogo)
              placeLogo('sleeve-right', primaryLogo)
            }}
          >
            <Shirt className="h-3.5 w-3.5" aria-hidden /> Sleeve branding
          </button>
        )}
        {usable('front-number') && (
          <button
            type="button"
            className="chip justify-center"
            data-active={!!byRole('front-number')}
            onClick={() => {
              const n = numL?.text?.content || '07'
              const ex = byRole('front-number')
              if (ex) removeLayer(ex.id)
              else {
                const z = zoneFor(zones, PLACES['front-number'])
                if (z) addTextLayer(z.id, { content: n, font: numL?.text?.font ?? 'russo' }, { role: 'front-number', scale: 0.8 })
              }
            }}
          >
            <Hash className="h-3.5 w-3.5" aria-hidden /> Front number
          </button>
        )}
      </div>

      {usable('player-number') && (
        <div className="grid grid-cols-[1fr_5rem] gap-2">
          <div>
            <label htmlFor={nameId} className="field-label flex items-center gap-1">
              <User className="h-3 w-3" aria-hidden /> Player name
            </label>
            <input
              id={nameId}
              className="input"
              maxLength={16}
              placeholder="e.g. NOVA_ACE"
              value={nameL?.text?.content ?? ''}
              onChange={(e) => setText('player-name', e.target.value.toUpperCase(), { arc: backIsUpper ? 0 : 20 }, backIsUpper ? { scale: 1 } : { offsetY: 1, scale: 0.8 })}
            />
          </div>
          <div>
            <label htmlFor={numId} className="field-label flex items-center gap-1">
              <Hash className="h-3 w-3" aria-hidden /> Number
            </label>
            <input
              id={numId}
              className="input text-center"
              inputMode="numeric"
              maxLength={2}
              placeholder="07"
              value={numL?.text?.content ?? ''}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 2)
                setText('player-number', v, { font: 'russo', outline: 0.05, outlineColor: kit.secondary }, { offsetY: backIsUpper ? -0.2 : -0.35, scale: 1.15 })
                const fn = useStudio.getState().design.layers.find((l) => l.role === 'front-number')
                if (fn && v) updateText(fn.id, { content: v })
              }}
            />
          </div>
        </div>
      )}
      {usable('slogan') && (
        <div>
          <label htmlFor={sloganId} className="field-label">
            Slogan (lower back)
          </label>
          <div className="flex gap-2">
            <input
              id={sloganId}
              className="input"
              maxLength={32}
              placeholder={kit.slogan || 'e.g. RISE TOGETHER'}
              value={sloganL?.text?.content ?? ''}
              onChange={(e) => setText('slogan', e.target.value, { font: kit.font }, { offsetY: -1, scale: 0.55 })}
            />
            {!sloganL && kit.slogan && (
              <button type="button" className="btn-secondary shrink-0 px-2 text-xs" onClick={() => setText('slogan', kit.slogan, { font: kit.font }, { offsetY: -1, scale: 0.55 })}>
                Use Brand Kit
              </button>
            )}
            {sloganL && (
              <button type="button" className="btn-ghost shrink-0 px-2" onClick={() => removeLayer(sloganL.id)} aria-label="Remove slogan">
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
