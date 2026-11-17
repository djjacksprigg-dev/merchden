import { CheckCircle2, CircleAlert, Info, LoaderCircle, X } from 'lucide-react'
import { useStudio } from '../../state/studio'
import { Modal } from './controls'

export function Toasts() {
  const toasts = useStudio((s) => s.toasts)
  const dismiss = useStudio((s) => s.dismissToast)
  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 sm:bottom-4" aria-live="polite" role="status">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-in pointer-events-auto flex items-start gap-2.5 rounded-xl border p-3 text-sm shadow-xl backdrop-blur ${
            t.kind === 'error' ? 'border-rose-400/30 bg-rose-950/90 text-rose-100' : t.kind === 'success' ? 'border-emerald-400/25 bg-navy-800/95 text-slate-100' : 'border-white/10 bg-navy-800/95 text-slate-100'
          }`}
        >
          {t.kind === 'error' ? (
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" aria-hidden />
          ) : t.kind === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
          ) : (
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
          )}
          <p className="flex-1 break-words">{t.text}</p>
          <button type="button" className="text-slate-400 hover:text-white" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  )
}

export function BusyOverlay() {
  const busy = useStudio((s) => s.busy)
  if (!busy) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy-950/40 backdrop-blur-[1px]" role="alertdialog" aria-busy="true" aria-label={busy.label}>
      <div className="w-72 rounded-xl border border-white/10 bg-navy-900 p-4 shadow-2xl">
        <p className="flex items-center gap-2 text-sm font-medium text-white">
          <LoaderCircle className="h-4 w-4 animate-spin text-accent" aria-hidden />
          {busy.label}
        </p>
        {busy.progress !== undefined && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-navy-700">
            <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${Math.max(4, busy.progress * 100)}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}

export function HelpModal() {
  const open = useStudio((s) => s.helpOpen)
  const setOpen = useStudio((s) => s.setHelpOpen)
  const quality = useStudio((s) => s.quality)
  const setQuality = useStudio((s) => s.setQuality)
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Help – Merch Forge">
      <div className="space-y-5 p-5 text-sm text-slate-300">
        <section>
          <h3 className="mb-1 font-semibold text-white">Quick start</h3>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Set up your organisation in the Brand Kit tab: name, logos, colours, font and slogan.</li>
            <li>Pick a product from the catalogue (or the product menu in the top bar).</li>
            <li>Upload logos in Graphics, choose a print location, then position, resize, rotate and layer them. Double-click the product to move the selected logo to that spot.</li>
            <li>Add text, colours and patterns. Use Undo / Redo (Ctrl+Z / Ctrl+Y) freely.</li>
            <li>Add each finished product to My collection, then export images, a ZIP or a collection board.</li>
          </ol>
        </section>
        <section>
          <h3 className="mb-1 font-semibold text-white">Your work stays on this computer</h3>
          <p className="mb-2">
            Merch Forge has no accounts and no server storage. Your logos, designs and portfolio notes are kept only in this browser tab while you work – nothing is uploaded, tracked or saved
            in the background.
          </p>
          <p className="mb-2">
            <strong className="text-white">To keep your work, press Download project</strong> (Ctrl+S). You get one <code>.merchforge</code> file containing everything. Next lesson, press Import
            project and choose that file. If you close or refresh the tab without downloading, your changes are gone – the “Unsaved changes” badge in the top bar tells you when you need to download again.
          </p>
          <p>Store your project file in your college OneDrive or student drive so it is available on any computer.</p>
        </section>
        <section>
          <h3 className="mb-1 font-semibold text-white">Performance mode</h3>
          <p className="mb-2">Turns off soft shadows and high-resolution rendering for older or low-power computers.</p>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="accent-[#ff7a1a]" checked={quality === 'low'} onChange={(e) => setQuality(e.target.checked ? 'low' : 'high')} />
            Performance mode {quality === 'low' ? 'on' : 'off'}
          </label>
        </section>
        <section>
          <h3 className="mb-1 font-semibold text-white">About the 3D models</h3>
          <p>
            Every product is an original procedural 3D model generated in your browser with Three.js – no photos or AI images. Garments are shown ghost-mannequin style. They are designed to
            look like real merchandise for presentation purposes, but they are not manufacturer templates, so check measurements with a supplier before printing real products.
          </p>
        </section>
        <section>
          <h3 className="mb-1 font-semibold text-white">Licences</h3>
          <p>Built with React, Three.js, React Three Fiber, Drei, Tailwind CSS, Zustand, Lucide and fflate (MIT / ISC licences), with fonts from Fontsource (SIL Open Font Licence). Sample logos are fictional and original. See ASSET_LICENCES.md in the project for the full register.</p>
        </section>
      </div>
    </Modal>
  )
}
