import { useEffect, useId, useRef, useState } from 'react'
import {
  Download,
  FilePlus2,
  FolderOpen,
  GraduationCap,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Redo2,
  Save,
  SlidersHorizontal,
  Undo2,
  Upload,
  ImageDown,
} from 'lucide-react'
import { useStudio } from '../../state/studio'
import { saveToCollection } from '../../lib/exporter'
import { Modal } from '../ui/controls'
import { PRODUCTS, CATEGORIES } from '../../three/catalogue'
import { redo, undo } from '../../state/history'
import { downloadProject, importProjectFile, newProject, PROJECT_EXT } from '../../storage/projectFile'

export function StudioMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
      <rect width="32" height="32" rx="8" fill="#151c2b" />
      <path d="M8 9.5 16 6l8 3.5v7.2c0 4.8-3.6 7.8-8 9.8-4.4-2-8-5-8-9.8z" fill="none" stroke="#ff7a1a" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M12.5 19.5v-8h2l3 4.6v-4.6h2v8h-2l-3-4.6v4.6z" fill="#fff" />
    </svg>
  )
}

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
}

export function TopBar() {
  const count = useStudio((s) => s.collection.length)
  const setCollectionOpen = useStudio((s) => s.setCollectionOpen)
  const setMobilePanel = useStudio((s) => s.setMobilePanel)
  const mobilePanel = useStudio((s) => s.mobilePanel)
  const setHelpOpen = useStudio((s) => s.setHelpOpen)
  const isSaved = useStudio((s) => s.collection.some((c) => c.id === s.design.id))
  const projectName = useStudio((s) => s.projectName)
  const setProjectName = useStudio((s) => s.setProjectName)
  const dirty = useStudio((s) => s.dirty)
  const canUndo = useStudio((s) => s.canUndo)
  const canRedo = useStudio((s) => s.canRedo)
  const productId = useStudio((s) => s.design.productId)
  const selectProduct = useStudio((s) => s.selectProduct)
  const leftCollapsed = useStudio((s) => s.leftCollapsed)
  const rightCollapsed = useStudio((s) => s.rightCollapsed)
  const portfolioOpen = useStudio((s) => s.portfolioOpen)
  const setPanels = useStudio((s) => s.setPanels)
  const setRightTab = useStudio((s) => s.setRightTab)
  const toast = useStudio((s) => s.toast)
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirm, setConfirm] = useState<null | 'import' | 'new'>(null)
  const productSel = useId()
  const nameId = useId()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod || isTyping(e)) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
        e.preventDefault()
        redo()
      } else if (k === 's') {
        e.preventDefault()
        downloadProject()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const doImport = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    try {
      const r = await importProjectFile(file)
      toast(`Project opened: ${r.products} saved product${r.products === 1 ? '' : 's'}, ${r.images} image${r.images === 1 ? '' : 's'}.`, 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'That project file could not be opened.', 'error')
    }
  }

  const startImport = () => (dirty ? setConfirm('import') : fileRef.current?.click())

  const exportDesigns = () => {
    setRightTab('export')
    if (window.matchMedia('(min-width: 1024px)').matches) setPanels({ rightCollapsed: false })
    else setMobilePanel('design')
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-1.5 whitespace-nowrap border-b border-white/8 bg-navy-900 px-2 sm:px-3">
      <div className="flex shrink-0 items-center gap-2 pr-1">
        <StudioMark />
        <p className="hidden whitespace-nowrap text-sm font-semibold tracking-tight text-white xl:block">Merch Forge</p>
      </div>

      <div className="flex min-w-0 items-center gap-1.5">
        <label htmlFor={nameId} className="sr-only">
          Project name
        </label>
        <input
          id={nameId}
          className="w-28 min-w-0 truncate rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-white hover:border-white/10 focus:border-accent focus:outline-none sm:w-40 xl:w-48"
          value={projectName}
          maxLength={80}
          onChange={(e) => setProjectName(e.target.value)}
        />
        <span
          className={`hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline-flex ${dirty ? 'bg-accent-soft text-orange-200' : 'bg-emerald-500/10 text-emerald-300'}`}
          role="status"
          title={dirty ? 'You have changes that are not in a downloaded project file yet.' : 'Everything is in your last downloaded project file.'}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${dirty ? 'bg-accent' : 'bg-emerald-400'}`} aria-hidden />
          {dirty ? 'Unsaved changes' : 'Saved to file'}
        </span>
      </div>

      <div className="hidden min-w-0 md:block">
        <label htmlFor={productSel} className="sr-only">
          Product
        </label>
        <select id={productSel} className="input h-8 w-40 py-0 text-xs xl:w-48" value={productId} onChange={(e) => selectProduct(e.target.value)}>
          {CATEGORIES.map((c) => (
            <optgroup key={c.id} label={c.name}>
              {PRODUCTS.filter((p) => p.category === c.id).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="flex items-center" role="group" aria-label="History">
        <button type="button" className="btn-ghost px-2" onClick={undo} disabled={!canUndo} aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)">
          <Undo2 className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" className="btn-ghost px-2" onClick={redo} disabled={!canRedo} aria-label="Redo (Ctrl+Y)" title="Redo (Ctrl+Y)">
          <Redo2 className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <nav className="ml-auto flex items-center gap-1" aria-label="Project">
        <button type="button" className="btn-ghost hidden px-2 lg:inline-flex" onClick={() => setPanels({ leftCollapsed: !leftCollapsed })} aria-label={leftCollapsed ? 'Show catalogue panel' : 'Hide catalogue panel'} title={leftCollapsed ? 'Show catalogue' : 'Hide catalogue'}>
          {leftCollapsed ? <PanelLeftOpen className="h-4 w-4" aria-hidden /> : <PanelLeftClose className="h-4 w-4" aria-hidden />}
        </button>
        <button type="button" className="btn-ghost hidden px-2 lg:inline-flex" onClick={() => setPanels({ rightCollapsed: !rightCollapsed })} aria-label={rightCollapsed ? 'Show design panel' : 'Hide design panel'} title={rightCollapsed ? 'Show design controls' : 'Hide design controls'}>
          {rightCollapsed ? <PanelRightOpen className="h-4 w-4" aria-hidden /> : <PanelRightClose className="h-4 w-4" aria-hidden />}
        </button>
        <span className="mx-0.5 hidden h-6 w-px bg-white/10 lg:block" aria-hidden />
        <button type="button" className="btn-ghost px-2" onClick={() => setCollectionOpen(true)} aria-label={`My collection (${count} saved)`} title="My collection">
          <FolderOpen className="h-4 w-4" aria-hidden />
          <span className="hidden 2xl:inline">Collection</span>
          {count > 0 && <span className="rounded-full bg-accent-soft px-1.5 text-[11px] font-semibold text-accent">{count}</span>}
        </button>
        <button type="button" className="btn-ghost px-2" onClick={() => saveToCollection(false)} aria-label={isSaved ? 'Update this product in My collection' : 'Add this product to My collection'} title={isSaved ? 'Update in collection' : 'Add to collection'}>
          <Save className="h-4 w-4" aria-hidden />
          <span className="hidden 2xl:inline">{isSaved ? 'Update' : 'Add to collection'}</span>
        </button>
        <button
          type="button"
          className="btn-ghost hidden px-2 sm:inline-flex"
          onClick={() => setPanels(portfolioOpen ? { portfolioOpen: false } : { portfolioOpen: true, leftCollapsed: true })}
          aria-pressed={portfolioOpen}
          aria-label="Student portfolio mode"
          title="Portfolio mode"
        >
          <GraduationCap className={`h-4 w-4 ${portfolioOpen ? 'text-accent' : ''}`} aria-hidden />
          <span className="hidden 2xl:inline">Portfolio</span>
        </button>
        <span className="mx-0.5 hidden h-6 w-px bg-white/10 sm:block" aria-hidden />
        <button type="button" className="btn-ghost hidden px-2 sm:inline-flex" onClick={() => (dirty ? setConfirm('new') : newProject())} aria-label="New project" title="New project">
          <FilePlus2 className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" className="btn-ghost px-2" onClick={startImport} aria-label="Import project" title={`Import project (${PROJECT_EXT})`}>
          <Upload className="h-4 w-4" aria-hidden />
          <span className="hidden 2xl:inline">Import</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={`${PROJECT_EXT},.json,application/json`}
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose a project file to import"
          onChange={(e) => {
            doImport(e.target.files)
            e.target.value = ''
          }}
        />
        <button type="button" className="btn-secondary px-2.5" onClick={downloadProject} aria-label="Download project file (Ctrl+S)" title="Download project file (Ctrl+S)">
          <Download className="h-4 w-4" aria-hidden />
          <span className="hidden 2xl:inline">Download project</span>
        </button>
        <button type="button" className="btn-primary px-2.5" onClick={exportDesigns} aria-label="Export designs">
          <ImageDown className="h-4 w-4" aria-hidden />
          <span className="hidden xl:inline">Export designs</span>
        </button>
        <button type="button" className="btn-ghost px-2" onClick={() => setHelpOpen(true)} aria-label="Help, privacy and licences" title="Help">
          <HelpCircle className="h-4 w-4" aria-hidden />
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
      </nav>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={confirm === 'new' ? 'Start a new project?' : 'Open another project?'}>
        <div className="space-y-4 p-5">
          <p className="text-sm text-slate-300">
            You have changes that haven’t been downloaded as a project file. {confirm === 'new' ? 'Starting a new project' : 'Opening another project'} replaces everything in this tab. Download your project first if you want to keep it.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setConfirm(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                downloadProject()
              }}
            >
              <Download className="h-4 w-4" aria-hidden /> Download first
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                const c = confirm
                setConfirm(null)
                if (c === 'new') newProject()
                else fileRef.current?.click()
              }}
            >
              {confirm === 'new' ? 'Discard and start new' : 'Discard and open'}
            </button>
          </div>
        </div>
      </Modal>
    </header>
  )
}
