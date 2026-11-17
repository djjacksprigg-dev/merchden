import { useId, useState } from 'react'
import { Camera, FileDown, GraduationCap, Pencil, Trash2, X } from 'lucide-react'
import { EMPTY_NOTES, useStudio } from '../../state/studio'
import { PRODUCT_MAP } from '../../three/catalogue'
import { snapshotCurrent } from '../../lib/exporter'
import { uid } from '../../lib/utils'
import type { PortfolioProductNotes } from '../../lib/types'

/** Optional sentence starters – the student writes the rest. */
const STARTERS: Record<string, string[]> = {
  audience: ['My target audience is ', 'They are aged ', 'They would buy this because '],
  why: ['I chose this product because ', 'Fans would use this product when '],
  represents: ['This design represents the brand by ', 'I used the colours ', 'The logo placement shows '],
  appeal: ['This would appeal to the audience because ', 'The style is popular with '],
  improve: ['If I made this again I would ', 'One thing I could improve is '],
  changes: ['Between version 1 and version 2 I changed ', 'I moved the logo from '],
  reasons: ['I made this change because ', 'Feedback from '],
  improvements: ['Overall my collection could be improved by ', 'The strongest product in my range is '],
}

function words(t: string) {
  return t.trim() ? t.trim().split(/\s+/).length : 0
}

function Answer({ label, value, onChange, starters, show }: { label: string; value: string; onChange: (v: string) => void; starters?: string[]; show: boolean }) {
  const id = useId()
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        <span className="text-[10px] text-slate-500" aria-live="polite">
          {words(value)} words
        </span>
      </div>
      {show && starters && (
        <div className="mb-1.5 flex flex-wrap gap-1" role="group" aria-label={`Sentence starters for ${label}`}>
          {starters.map((st) => (
            <button
              key={st}
              type="button"
              className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-300 hover:border-accent hover:text-white"
              onClick={() => onChange(value ? `${value.trimEnd()} ${st}` : st)}
            >
              {st.trim()}…
            </button>
          ))}
        </div>
      )}
      <textarea id={id} className="input min-h-20 resize-y text-sm" maxLength={3000} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

export function PortfolioPanel() {
  const open = useStudio((s) => s.portfolioOpen)
  const setPanels = useStudio((s) => s.setPanels)
  const portfolio = useStudio((s) => s.portfolio)
  const setPortfolio = useStudio((s) => s.setPortfolio)
  const setNotes = useStudio((s) => s.setProductNotes)
  const addVersion = useStudio((s) => s.addVersion)
  const removeVersion = useStudio((s) => s.removeVersion)
  const collection = useStudio((s) => s.collection)
  const editSaved = useStudio((s) => s.editSaved)
  const currentId = useStudio((s) => s.design.id)
  const kit = useStudio((s) => s.brandKit)
  const setKit = useStudio((s) => s.setBrandKit)
  const busy = useStudio((s) => !!s.busy)
  const toast = useStudio((s) => s.toast)
  const [starters, setStarters] = useState(true)
  const orgId = useId()
  const titleId = useId()

  if (!open) return null

  const notesFor = (id: string): PortfolioProductNotes => portfolio.products[id] ?? { ...EMPTY_NOTES, versions: [] }

  const exportPdf = async () => {
    try {
      const { buildPortfolioPdf } = await import('../../lib/portfolioPdf')
      await buildPortfolioPdf()
    } catch (e) {
      console.error(e)
      toast('The portfolio could not be created. Try again.', 'error')
    }
  }

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-white/10 bg-navy-900 shadow-2xl"
      aria-label="Student portfolio"
      role="complementary"
    >
      <header className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
        <GraduationCap className="h-5 w-5 text-accent" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-white">Student portfolio</h2>
          <p className="text-[11px] text-slate-400">Optional. Your answers are your own words – nothing is written for you.</p>
        </div>
        <button type="button" className="btn-ghost px-2" onClick={() => setPanels({ portfolioOpen: false })} aria-label="Close portfolio">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </header>

      <div className="scroll-thin flex-1 space-y-6 overflow-y-auto px-4 py-4">
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" className="accent-[#ff7a1a]" checked={starters} onChange={(e) => setStarters(e.target.checked)} />
          Show sentence starters
        </label>

        <section className="space-y-3">
          <h3 className="panel-title">Your project</h3>
          <div>
            <label htmlFor={orgId} className="field-label">
              Esports organisation name
            </label>
            <input id={orgId} className="input" maxLength={80} value={kit.orgName} onChange={(e) => setKit({ orgName: e.target.value })} />
          </div>
          <div>
            <label htmlFor={titleId} className="field-label">
              Project title
            </label>
            <input id={titleId} className="input" maxLength={120} placeholder="e.g. Unit 7 – Merchandise range" value={portfolio.studentProject} onChange={(e) => setPortfolio({ studentProject: e.target.value })} />
          </div>
          <Answer label="Target audience" value={portfolio.audience} onChange={(v) => setPortfolio({ audience: v })} starters={STARTERS.audience} show={starters} />
        </section>

        <section className="space-y-4">
          <h3 className="panel-title">Products</h3>
          {!collection.length && <p className="rounded-lg border border-white/8 bg-navy-850 p-3 text-sm text-slate-400">Add products to My collection first – each one gets its own page in your portfolio.</p>}
          {collection.map((d) => {
            const n = notesFor(d.id)
            const def = PRODUCT_MAP[d.productId]
            const inEditor = currentId === d.id
            return (
              <article key={d.id} className="space-y-3 rounded-xl border border-white/8 bg-navy-850 p-3">
                <div className="flex items-center gap-3">
                  {d.thumbnail && <img src={d.thumbnail} alt="" className="h-14 w-14 rounded-lg object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{d.title}</p>
                    <p className="text-[11px] text-slate-400">{def?.name}</p>
                  </div>
                  {!inEditor && (
                    <button type="button" className="btn-ghost px-2 text-xs" onClick={() => editSaved(d.id)}>
                      <Pencil className="h-3.5 w-3.5" aria-hidden /> Open
                    </button>
                  )}
                </div>
                <Answer label="Why I chose this product" value={n.why} onChange={(v) => setNotes(d.id, { why: v })} starters={STARTERS.why} show={starters} />
                <Answer label="How it represents the brand" value={n.represents} onChange={(v) => setNotes(d.id, { represents: v })} starters={STARTERS.represents} show={starters} />
                <Answer label="Why it would appeal to the audience" value={n.appeal} onChange={(v) => setNotes(d.id, { appeal: v })} starters={STARTERS.appeal} show={starters} />
                <Answer label="What I would improve" value={n.improve} onChange={(v) => setNotes(d.id, { improve: v })} starters={STARTERS.improve} show={starters} />

                <div className="space-y-2 border-t border-white/6 pt-3">
                  <div className="flex items-center justify-between">
                    <p className="field-label mb-0">Versions ({n.versions.length}/4)</p>
                    <button
                      type="button"
                      className="btn-secondary px-2 py-1 text-xs"
                      disabled={!inEditor || busy || n.versions.length >= 4}
                      title={inEditor ? 'Save a picture of the design as it is now' : 'Open this product in the editor first'}
                      onClick={async () => {
                        const image = await snapshotCurrent()
                        if (!image) return
                        const design = useStudio.getState().design
                        addVersion(d.id, { id: uid('ver'), label: `Version ${n.versions.length + 1}`, image, design: JSON.parse(JSON.stringify(design)), createdAt: Date.now() })
                      }}
                    >
                      <Camera className="h-3.5 w-3.5" aria-hidden /> Capture version
                    </button>
                  </div>
                  {!inEditor && <p className="text-[11px] text-slate-500">Open this product to capture versions as you change it.</p>}
                  {n.versions.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {n.versions.map((v) => (
                        <figure key={v.id} className="relative overflow-hidden rounded-lg border border-white/8">
                          <img src={v.image} alt={`${d.title} ${v.label}`} className="aspect-square w-full object-cover" />
                          <figcaption className="flex items-center justify-between bg-navy-950/90 px-2 py-1 text-[11px] text-slate-200">
                            {v.label}
                            <button type="button" className="text-slate-400 hover:text-rose-300" onClick={() => removeVersion(d.id, v.id)} aria-label={`Remove ${v.label}`}>
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  )}
                  {n.versions.length > 1 && (
                    <>
                      <Answer label="What changed between versions" value={n.changes} onChange={(v) => setNotes(d.id, { changes: v })} starters={STARTERS.changes} show={starters} />
                      <Answer label="Why I made the changes" value={n.reasons} onChange={(v) => setNotes(d.id, { reasons: v })} starters={STARTERS.reasons} show={starters} />
                    </>
                  )}
                </div>
              </article>
            )
          })}
        </section>

        <section className="space-y-3">
          <h3 className="panel-title">Evaluation</h3>
          <Answer label="Improvements to the whole range" value={portfolio.improvements} onChange={(v) => setPortfolio({ improvements: v })} starters={STARTERS.improvements} show={starters} />
        </section>
      </div>

      <footer className="border-t border-white/8 p-4">
        <button type="button" className="btn-primary w-full" onClick={exportPdf} disabled={busy}>
          <FileDown className="h-4 w-4" aria-hidden /> Download portfolio (PDF)
        </button>
        <p className="mt-2 text-[11px] text-slate-500">Made in your browser. Portfolio notes are saved inside your .merchforge project file.</p>
      </footer>
    </aside>
  )
}
