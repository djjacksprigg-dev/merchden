import { useState } from 'react'
import { Download, FolderOpen, HelpCircle, LayoutGrid, RotateCcw, Save, SlidersHorizontal } from 'lucide-react'
import { useStudio } from '../../state/studio'
import { downloadCurrent, saveToCollection } from '../../lib/exporter'
import { Modal } from '../ui/controls'

export function StudioMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
      <rect width="32" height="32" rx="8" fill="#131c2e" />
      <path d="M8 9.5 16 6l8 3.5v7.2c0 4.8-3.6 7.8-8 9.8-4.4-2-8-5-8-9.8z" fill="none" stroke="#2f8cff" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M12.5 19.5v-8h2l3 4.6v-4.6h2v8h-2l-3-4.6v4.6z" fill="#fff" />
    </svg>
  )
}

export function TopBar() {
  const count = useStudio((s) => s.collection.length)
  const setCollectionOpen = useStudio((s) => s.setCollectionOpen)
  const setMobilePanel = useStudio((s) => s.setMobilePanel)
  const mobilePanel = useStudio((s) => s.mobilePanel)
  const resetDesign = useStudio((s) => s.resetDesign)
  const setHelpOpen = useStudio((s) => s.setHelpOpen)
  const isSaved = useStudio((s) => s.collection.some((c) => c.id === s.design.id))
  const [confirmReset, setConfirmReset] = useState(false)

  const openCatalogue = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      document.getElementById('catalogue-search')?.focus()
    } else setMobilePanel(mobilePanel === 'catalogue' ? null : 'catalogue')
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/8 bg-navy-900 px-3 sm:px-4">
      <div className="flex shrink-0 items-center gap-2.5 pr-2">
        <StudioMark />
        <div className="leading-tight">
          <p className="whitespace-nowrap text-sm font-semibold tracking-tight text-white">Merch Forge</p>
          <p className="hidden text-[11px] text-slate-400 sm:block">Esports merchandise studio</p>
        </div>
      </div>

      <nav className="ml-1 flex items-center gap-0.5" aria-label="Studio">
        <button type="button" className="btn-ghost" onClick={openCatalogue} aria-label="Merchandise catalogue">
          <LayoutGrid className="h-4 w-4" aria-hidden />
          <span className="hidden md:inline">Catalogue</span>
        </button>
        <button type="button" className="btn-ghost" onClick={() => setCollectionOpen(true)} aria-label={`My designs (${count} saved)`}>
          <FolderOpen className="h-4 w-4" aria-hidden />
          <span className="hidden md:inline">My designs</span>
          {count > 0 && <span className="rounded-full bg-accent-soft px-1.5 text-[11px] font-semibold text-accent">{count}</span>}
        </button>
        <button type="button" className="btn-ghost" onClick={() => setConfirmReset(true)} aria-label="Reset design">
          <RotateCcw className="h-4 w-4" aria-hidden />
          <span className="hidden md:inline">Reset</span>
        </button>
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        <button type="button" className="btn-ghost hidden px-2 sm:inline-flex" onClick={() => setHelpOpen(true)} aria-label="Help, privacy and licences">
          <HelpCircle className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" className="btn-secondary px-3" onClick={() => saveToCollection(false)} aria-label={isSaved ? 'Update saved design' : 'Save to My designs'}>
          <Save className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">{isSaved ? 'Update' : 'Save'}</span>
        </button>
        <button type="button" className="btn-primary px-3" onClick={() => downloadCurrent({ transparent: false, view: null, size: 2048 })} aria-label="Download image (PNG)">
          <Download className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Download image</span>
        </button>
        <button
          type="button"
          className="btn-ghost px-2 lg:hidden"
          onClick={() => setMobilePanel(mobilePanel === 'design' ? null : 'design')}
          aria-label="Design controls"
          aria-pressed={mobilePanel === 'design'}
        >
          <SlidersHorizontal className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset this design?">
        <div className="space-y-4 p-5">
          <p className="text-sm text-slate-300">
            This puts the product back to its original colours and default logo position. Your uploaded logos and anything saved in My designs are not affected.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                resetDesign()
                setConfirmReset(false)
              }}
            >
              Reset design
            </button>
          </div>
        </div>
      </Modal>
    </header>
  )
}
