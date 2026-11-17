import { useRef, useState } from 'react'
import { Download, FileArchive, FileJson, FolderInput, LayoutGrid, Pencil, Presentation, Trash2, Upload } from 'lucide-react'
import { useStudio } from '../../state/studio'
import { Modal } from '../ui/controls'
import { PRODUCT_MAP } from '../../three/catalogue'
import { downloadCollectionZip, downloadPresentationSheet, downloadSaved, ALL_VIEWS } from '../../lib/exporter'
import { buildProjectFile, importProject, parseProjectFile } from '../../storage/db'
import { downloadBlob, safeName } from '../../lib/utils'
import type { ViewName } from '../../lib/types'

export function CollectionModal() {
  const open = useStudio((s) => s.collectionOpen)
  const setOpen = useStudio((s) => s.setCollectionOpen)
  const collection = useStudio((s) => s.collection)
  const logos = useStudio((s) => s.logos)
  const editSaved = useStudio((s) => s.editSaved)
  const setCollection = useStudio((s) => s.setCollection)
  const project = useStudio((s) => s.project)
  const storageAvailable = useStudio((s) => s.storageAvailable)
  const toast = useStudio((s) => s.toast)
  const busy = useStudio((s) => !!s.busy)
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [allViews, setAllViews] = useState(false)

  const exportProject = () => {
    const f = buildProjectFile()
    const blob = new Blob([JSON.stringify(f)], { type: 'application/json' })
    downloadBlob(blob, `${safeName(project.orgName || 'MerchProject')}_${new Date().toISOString().slice(0, 10)}.merchforge.json`)
    toast('Project exported. Copy this file to another computer and use “Import project” there.', 'success')
  }

  const onImport = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    if (file.size > 80 * 1024 * 1024) {
      toast('That file is too large to be a Merch Forge project.', 'error')
      return
    }
    try {
      const f = parseProjectFile(await file.text())
      const r = importProject(f)
      toast(`Imported ${r.designs} design${r.designs === 1 ? '' : 's'} and ${r.logos} logo${r.logos === 1 ? '' : 's'}.`, 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Import failed.', 'error')
    }
  }

  const views: ViewName[] = allViews ? ALL_VIEWS : ['front', 'three-quarter']

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="My designs" wide>
      <div className="flex flex-wrap items-center gap-2 border-b border-white/8 px-5 py-3">
        <button type="button" className="btn-primary" disabled={!collection.length || busy} onClick={() => downloadCollectionZip({ size: 2048, views, transparent: false, includeSheets: true })}>
          <FileArchive className="h-4 w-4" aria-hidden /> Download collection (ZIP)
        </button>
        <button type="button" className="btn-secondary" disabled={!collection.length || busy} onClick={() => downloadPresentationSheet('presentation')}>
          <Presentation className="h-4 w-4" aria-hidden /> Presentation sheet
        </button>
        <button type="button" className="btn-secondary" disabled={!collection.length || busy} onClick={() => downloadPresentationSheet('contact')}>
          <LayoutGrid className="h-4 w-4" aria-hidden /> Contact sheet
        </button>
        <label className="ml-1 flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" className="accent-[#2f8cff]" checked={allViews} onChange={(e) => setAllViews(e.target.checked)} />
          All 4 views per product in ZIP
        </label>
        <div className="ml-auto flex gap-2">
          <button type="button" className="btn-ghost" onClick={exportProject} disabled={!collection.length}>
            <FileJson className="h-4 w-4" aria-hidden /> Export project
          </button>
          <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()}>
            <FolderInput className="h-4 w-4" aria-hidden /> Import project
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            aria-label="Import project file"
            onChange={(e) => {
              onImport(e.target.files)
              e.target.value = ''
            }}
          />
        </div>
      </div>

      <div className="px-5 py-4">
        {!collection.length ? (
          <div className="flex flex-col items-center py-14 text-center">
            <Upload className="mb-3 h-8 w-8 text-slate-500" aria-hidden />
            <p className="font-medium text-white">No saved designs yet</p>
            <p className="mt-1 max-w-sm text-sm text-slate-400">Design a product, then press Save in the top bar. Build a full range – jersey, hoodie, cap, bottle, mouse mat – and download it all at once.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {collection.map((d) => {
              const def = PRODUCT_MAP[d.productId]
              const logoIds = [...new Set(d.layers.map((l) => l.logoId).filter(Boolean))] as string[]
              return (
                <li key={d.id} className="overflow-hidden rounded-xl border border-white/10 bg-navy-850">
                  {d.thumbnail ? (
                    <img src={d.thumbnail} alt={`${d.title || def.name} preview`} className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-navy-800 text-xs text-slate-500">Preview generated on next save</div>
                  )}
                  <div className="space-y-2 p-3">
                    <div>
                      <p className="truncate text-sm font-semibold text-white">{d.title || def.shortName}</p>
                      <p className="text-[11px] text-slate-400">{def.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1" aria-label="Colours">
                        {def.colorSlots.map((s) => (
                          <span key={s.id} className="h-4 w-4 rounded-full border border-white/20" style={{ background: d.colors[s.id] }} title={`${s.label}: ${d.colors[s.id]}`} />
                        ))}
                      </div>
                      <div className="ml-auto flex gap-1">
                        {logoIds.slice(0, 3).map((id) =>
                          logos[id] ? <img key={id} src={logos[id].dataUrl} alt={`Logo ${logos[id].name}`} className="h-6 w-6 rounded bg-navy-950 object-contain p-0.5" /> : null,
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 pt-1">
                      <button type="button" className="btn-secondary flex-1 px-2 py-1.5 text-xs" onClick={() => editSaved(d.id)} aria-label={`Edit ${d.title || def.name}`}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                      </button>
                      <button type="button" className="btn-secondary px-2 py-1.5 text-xs" disabled={busy} onClick={() => downloadSaved(d, { size: 2048, transparent: false })} aria-label={`Download ${d.title || def.name} views`}>
                        <Download className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button type="button" className="btn-danger px-2 py-1.5 text-xs" onClick={() => setConfirmDelete(d.id)} aria-label={`Delete ${d.title || def.name}`}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                    {confirmDelete === d.id && (
                      <div className="rounded-lg bg-rose-500/10 p-2 text-xs text-rose-200" role="alert">
                        Delete this design?
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            className="rounded bg-rose-500 px-2 py-1 font-semibold text-white"
                            onClick={() => {
                              setCollection(collection.filter((c) => c.id !== d.id))
                              setConfirmDelete(null)
                            }}
                          >
                            Delete
                          </button>
                          <button type="button" className="rounded px-2 py-1 text-slate-200 hover:bg-white/10" onClick={() => setConfirmDelete(null)}>
                            Keep
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <p className="mt-5 text-xs text-slate-500">
          {storageAvailable
            ? 'Designs are saved in this browser on this computer only – they do not sync to other devices. Use Export project to move your work to another college computer, then Import project there.'
            : 'Browser storage is not available here, so designs will be lost when you close the page. Use Export project to keep them.'}
        </p>
      </div>
    </Modal>
  )
}
