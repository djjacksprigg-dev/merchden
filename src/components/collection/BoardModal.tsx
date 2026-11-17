import { useId, useState } from 'react'
import { Download, LayoutTemplate } from 'lucide-react'
import { useStudio } from '../../state/studio'
import { Modal } from '../ui/controls'
import { downloadBoard } from '../../lib/exporter'
import { BOARD_FORMATS, type BoardOptions } from '../../lib/sheets'

export function BoardModal() {
  const open = useStudio((s) => s.boardOpen)
  const setPanels = useStudio((s) => s.setPanels)
  const count = useStudio((s) => s.collection.length)
  const projectName = useStudio((s) => s.projectName)
  const busy = useStudio((s) => !!s.busy)
  const [format, setFormat] = useState<(typeof BOARD_FORMATS)[number]['id']>('16x9')
  const [theme, setTheme] = useState<BoardOptions['theme']>('light')
  const [showNotes, setShowNotes] = useState(true)
  const [title, setTitle] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const titleId = useId()

  return (
    <Modal open={open} onClose={() => setPanels({ boardOpen: false })} title="Collection board" wide>
      <div className="grid gap-5 p-5 md:grid-cols-[18rem_1fr]">
        <div className="space-y-4">
          <div>
            <p className="field-label">Format</p>
            <div className="space-y-1.5" role="radiogroup" aria-label="Board format">
              {BOARD_FORMATS.map((f) => (
                <button key={f.id} type="button" role="radio" aria-checked={format === f.id} className="chip w-full justify-start" onClick={() => setFormat(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="field-label">Style</p>
            <div className="flex gap-1.5" role="radiogroup" aria-label="Board style">
              {(
                [
                  ['light', 'Light'],
                  ['dark', 'Dark'],
                  ['brand', 'Brand colours'],
                ] as const
              ).map(([id, label]) => (
                <button key={id} type="button" role="radio" aria-checked={theme === id} className="chip" onClick={() => setTheme(id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor={titleId} className="field-label">
              Subtitle
            </label>
            <input id={titleId} className="input" maxLength={60} placeholder={projectName} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" className="accent-[#ff7a1a]" checked={showNotes} onChange={(e) => setShowNotes(e.target.checked)} />
            Show brand colours and design rationale
          </label>
          <button
            type="button"
            className="btn-primary w-full"
            disabled={!count || busy}
            onClick={async () => {
              const p = await downloadBoard({ format, theme, title, showNotes })
              if (p) setPreview(p)
            }}
          >
            <Download className="h-4 w-4" aria-hidden /> Download board (PNG)
          </button>
          <p className="text-[11px] text-slate-500">Every product in My collection ({count}) is rendered fresh from 3D at high resolution, in collection order.</p>
        </div>
        <div className="flex min-h-64 items-center justify-center rounded-xl border border-white/8 bg-navy-950 p-3">
          {preview ? (
            <img src={preview} alt="Preview of the downloaded collection board" className="max-h-[60vh] w-full rounded-lg object-contain" />
          ) : (
            <p className="flex flex-col items-center gap-2 text-center text-sm text-slate-500">
              <LayoutTemplate className="h-8 w-8" aria-hidden />
              Your board preview appears here after you download it.
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}
