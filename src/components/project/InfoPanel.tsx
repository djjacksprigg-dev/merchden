import { useId } from 'react'
import { selectDef, useStudio } from '../../state/studio'

function Field({ label, value, onChange, placeholder, multiline, max = 80 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; max?: number }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {multiline ? (
        <textarea id={id} className="input min-h-24 resize-y" value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} className="input" value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  )
}

export function InfoPanel() {
  const project = useStudio((s) => s.project)
  const setProject = useStudio((s) => s.setProject)
  const design = useStudio((s) => s.design)
  const setDesignText = useStudio((s) => s.setDesignText)
  const def = useStudio(selectDef)
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="panel-title">Project (all designs)</p>
        <Field label="Esports organisation name" value={project.orgName} placeholder="e.g. Nova Vanguard" onChange={(v) => setProject({ orgName: v })} />
        <Field label="Student project name" value={project.projectName} placeholder="e.g. 2027 Season Merch Range" onChange={(v) => setProject({ projectName: v })} />
        <Field
          label="Design rationale (appears on the collection sheet)"
          value={project.rationale}
          multiline
          max={1500}
          placeholder="Explain your colour choices, logo placement and who the merchandise is for…"
          onChange={(v) => setProject({ rationale: v })}
        />
      </div>
      <div className="space-y-3 border-t border-white/6 pt-4">
        <p className="panel-title">This product</p>
        <Field label="Product name" value={design.title} placeholder={def.shortName} onChange={(v) => setDesignText({ title: v })} />
        <Field label="Design description" value={design.description} multiline max={600} placeholder="What makes this item part of your brand?" onChange={(v) => setDesignText({ description: v })} />
      </div>
      <p className="text-[11px] text-slate-500">The organisation and product names are used in download file names, e.g. {`${(project.orgName || 'TeamName').replace(/\s+/g, '-')}_${(design.title || def.shortName).replace(/\s+/g, '-')}_Front.png`}.</p>
    </div>
  )
}
