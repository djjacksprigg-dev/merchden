import { useEffect, useState } from 'react'
import { hostDownloadsReady, isFramed } from '../lib/utils'
import { LoaderCircle, X } from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { CatalogueSidebar } from '../components/catalogue/CatalogueSidebar'
import { DesignSidebar } from '../components/layout/DesignSidebar'
import { Viewer } from '../components/viewer/Viewer'
import { CollectionModal } from '../components/collection/CollectionModal'
import { BusyOverlay, HelpModal, Toasts } from '../components/ui/Feedback'
import { useStudio } from '../state/studio'

export function App() {
  const hydrated = useStudio((s) => s.hydrated)
  const mobilePanel = useStudio((s) => s.mobilePanel)
  const setMobilePanel = useStudio((s) => s.setMobilePanel)
  const [framed, setFramed] = useState(false)
  useEffect(() => {
    if (!isFramed) return
    let alive = true
    // window.claude may appear slightly after load
    const t = setTimeout(() => hostDownloadsReady.then((ok) => alive && setFramed(!ok)), 1500)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [])

  // close drawers with Escape on small screens
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobilePanel(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setMobilePanel])

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center bg-navy-950 text-sm text-slate-300">
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin text-accent" aria-hidden /> Opening the studio…
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <a href="#design-controls" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[80] focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-white">
        Skip to design controls
      </a>
      <TopBar />
      {framed && (
        <div className="shrink-0 border-b border-amber-400/20 bg-amber-500/10 px-4 py-1.5 text-center text-xs text-amber-200" role="note">
          Preview mode: this page is embedded, and the frame blocks file downloads. Open the deployed site (or run it locally) to download PNGs and ZIPs.
        </div>
      )}
      <div className="relative flex min-h-0 flex-1">
        {/* Catalogue */}
        <aside
          className={`${
            mobilePanel === 'catalogue' ? 'translate-x-0' : '-translate-x-full'
          } absolute inset-y-0 left-0 z-30 w-[min(20rem,88vw)] border-r border-white/8 bg-navy-900 transition-transform duration-200 lg:static lg:z-auto lg:w-72 lg:translate-x-0 xl:w-80`}
          aria-label="Merchandise catalogue"
        >
          <div className="flex items-center justify-between border-b border-white/6 px-3 py-2 lg:hidden">
            <span className="panel-title">Catalogue</span>
            <button type="button" className="btn-ghost px-2" onClick={() => setMobilePanel(null)} aria-label="Close catalogue">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="h-[calc(100%-45px)] lg:h-full">
            <CatalogueSidebar />
          </div>
        </aside>

        {/* Viewer */}
        <main className="relative min-w-0 flex-1">
          <Viewer />
        </main>

        {/* Design controls */}
        <aside
          id="design-controls"
          className={`${
            mobilePanel === 'design' ? 'translate-x-0' : 'translate-x-full'
          } absolute inset-y-0 right-0 z-30 w-[min(22rem,92vw)] border-l border-white/8 bg-navy-900 transition-transform duration-200 lg:static lg:z-auto lg:w-[22rem] lg:translate-x-0`}
          aria-label="Design controls"
        >
          <div className="flex items-center justify-between border-b border-white/6 px-3 py-2 lg:hidden">
            <span className="panel-title">Customise</span>
            <button type="button" className="btn-ghost px-2" onClick={() => setMobilePanel(null)} aria-label="Close design controls">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="h-[calc(100%-45px)] lg:h-full">
            <DesignSidebar />
          </div>
        </aside>

        {mobilePanel && <div className="absolute inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setMobilePanel(null)} aria-hidden />}

        {/* mobile quick bar */}
        <div className="absolute left-3 top-3 z-10 flex gap-2 lg:hidden">
          <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setMobilePanel('catalogue')}>
            Products
          </button>
          <button type="button" className="btn-primary px-3 py-1.5 text-xs" onClick={() => setMobilePanel('design')}>
            Customise
          </button>
        </div>
      </div>
      <CollectionModal />
      <HelpModal />
      <BusyOverlay />
      <Toasts />
    </div>
  )
}
