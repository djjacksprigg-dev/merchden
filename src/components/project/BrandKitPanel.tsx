import { useId } from 'react'
import { Palette, Shirt } from 'lucide-react'
import { selectDef, useStudio } from '../../state/studio'
import { ColorField } from '../ui/controls'
import { FONTS } from '../../three/engine/text'

function Field({ label, value, onChange, placeholder, multiline, max = 80 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; max?: number }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {multiline ? (
        <textarea id={id} className="input min-h-20 resize-y" value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} className="input" value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  )
}

function LogoSelect({ label, value, onChange }: { label: string; value: string | null; onChange: (id: string | null) => void }) {
  const id = useId()
  const logos = useStudio((s) => s.logos)
  const library = Object.values(logos).filter((l) => !l.hidden && l.purpose !== 'pattern')
  const current = value ? logos[value] : null
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-navy-950">
          {current ? <img src={current.dataUrl} alt="" className="max-h-8 max-w-8 object-contain" /> : <span className="text-[10px] text-slate-500">None</span>}
        </div>
        <select id={id} className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} disabled={!library.length}>
          <option value="">{library.length ? 'No logo' : 'Upload a logo in Graphics first'}</option>
          {library.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export function BrandKitPanel() {
  const kit = useStudio((s) => s.brandKit)
  const setKit = useStudio((s) => s.setBrandKit)
  const apply = useStudio((s) => s.applyBrandKit)
  const collectionCount = useStudio((s) => s.collection.length)
  const toast = useStudio((s) => s.toast)
  const project = useStudio((s) => s.project)
  const setProject = useStudio((s) => s.setProject)
  const design = useStudio((s) => s.design)
  const setDesignText = useStudio((s) => s.setDesignText)
  const def = useStudio(selectDef)
  const fontId = useId()

  return (
    <div className="space-y-5">
      <p className="text-xs text-slate-400">Set up your organisation once. Brand Kit colours, logos and font can be applied to any product in this project.</p>
      <Field label="Organisation name" value={kit.orgName} placeholder="e.g. Nova Vanguard" onChange={(v) => setKit({ orgName: v })} />
      <LogoSelect label="Primary logo" value={kit.primaryLogoId} onChange={(id) => setKit({ primaryLogoId: id })} />
      <LogoSelect label="Secondary logo (sponsor / alt mark)" value={kit.secondaryLogoId} onChange={(id) => setKit({ secondaryLogoId: id })} />
      <ColorField label="Primary colour" value={kit.primary} onChange={(hex) => setKit({ primary: hex })} />
      <ColorField label="Secondary colour" value={kit.secondary} onChange={(hex) => setKit({ secondary: hex })} />
      <ColorField label="Accent colour" value={kit.accent} onChange={(hex) => setKit({ accent: hex })} />
      <div>
        <label htmlFor={fontId} className="field-label">
          Preferred font
        </label>
        <select id={fontId} className="input" value={kit.font} onChange={(e) => setKit({ font: e.target.value })} style={{ fontFamily: FONTS.find((f) => f.id === kit.font)?.family }}>
          {FONTS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      <Field label="Slogan" value={kit.slogan} placeholder="e.g. Rise Together" onChange={(v) => setKit({ slogan: v })} />

      <div className="grid grid-cols-1 gap-2">
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            apply('current')
            toast(`Brand Kit applied to this ${def.shortName.toLowerCase()}.`, 'success')
          }}
        >
          <Shirt className="h-4 w-4" aria-hidden /> Apply to this product
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={!collectionCount}
          onClick={() => {
            apply('collection')
            toast(`Brand Kit applied to ${collectionCount} saved product${collectionCount === 1 ? '' : 's'}. Previews update when you open each one.`, 'success')
          }}
        >
          <Palette className="h-4 w-4" aria-hidden /> Apply to whole collection
        </button>
        <p className="text-[11px] text-slate-500">Applying recolours the product with your primary, secondary and accent colours, uses your font on text, and places your primary logo (sponsor slots get the secondary logo). You can undo it.</p>
      </div>

      <div className="space-y-3 border-t border-white/6 pt-4">
        <p className="panel-title">This product</p>
        <Field label="Product name" value={design.title} placeholder={def.shortName} max={60} onChange={(v) => setDesignText({ title: v })} />
        <Field label="Design description" value={design.description} multiline max={600} placeholder="What makes this item part of your brand?" onChange={(v) => setDesignText({ description: v })} />
      </div>
      <div className="space-y-3 border-t border-white/6 pt-4">
        <p className="panel-title">Collection notes</p>
        <Field
          label="Design rationale (printed on the collection board)"
          value={project.rationale}
          multiline
          max={1500}
          placeholder="Explain your colour choices, logo placement and who the merchandise is for…"
          onChange={(v) => setProject({ rationale: v })}
        />
      </div>
    </div>
  )
}
