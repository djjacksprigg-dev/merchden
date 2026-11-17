import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { normaliseHex } from '../../lib/utils'

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  disabled,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format?: (v: number) => string
  disabled?: boolean
}) {
  const id = useId()
  const fill = ((value - min) / (max - min)) * 100
  return (
    <div className={disabled ? 'opacity-40' : ''}>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-medium text-slate-400">
          {label}
        </label>
        <span className="text-xs tabular-nums text-slate-300">{format ? format(value) : value}</span>
      </div>
      <input
        id={id}
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        style={{ ['--fill' as string]: `${fill}%` }}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  )
}

export const PRESET_COLOURS = [
  '#0b0f17',
  '#1f2937',
  '#6b7280',
  '#e5e7eb',
  '#ffffff',
  '#0b1630',
  '#1d3b8f',
  '#2f8cff',
  '#06b6d4',
  '#10b981',
  '#84cc16',
  '#facc15',
  '#f97316',
  '#ef4444',
  '#be123c',
  '#a855f7',
  '#6d28d9',
  '#ec4899',
]

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  const id = useId()
  const [text, setText] = useState(value)
  const [error, setError] = useState(false)
  useEffect(() => {
    setText(value)
    setError(false)
  }, [value])
  const commit = (t: string) => {
    const hex = normaliseHex(t)
    if (hex) {
      setError(false)
      onChange(hex)
    } else setError(true)
  }
  return (
    <fieldset className="space-y-2">
      <legend className="field-label">{label}</legend>
      <div className="flex items-center gap-2">
        <input
          type="color"
          className="swatch-input h-9 w-11 shrink-0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} – colour picker`}
        />
        <div className="relative flex-1">
          <label htmlFor={id} className="sr-only">
            {label} hex code
          </label>
          <input
            id={id}
            className={`input font-mono uppercase ${error ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-400/30' : ''}`}
            value={text}
            maxLength={7}
            spellCheck={false}
            onChange={(e) => {
              setText(e.target.value)
              if (normaliseHex(e.target.value) && e.target.value.replace('#', '').length === 6) commit(e.target.value)
            }}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commit((e.target as HTMLInputElement).value)}
            aria-invalid={error}
            aria-describedby={error ? `${id}-err` : undefined}
          />
        </div>
      </div>
      {error && (
        <p id={`${id}-err`} className="text-xs text-rose-300">
          Enter a HEX colour like #2F8CFF
        </p>
      )}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={`${label} presets`}>
        {PRESET_COLOURS.map((c) => (
          <button
            key={c}
            type="button"
            className={`h-6 w-6 rounded-md border transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              value.toLowerCase() === c ? 'border-white ring-2 ring-accent' : 'border-white/15'
            }`}
            style={{ background: c }}
            onClick={() => onChange(c)}
            aria-label={`Use ${c}`}
            aria-pressed={value.toLowerCase() === c}
          />
        ))}
      </div>
    </fieldset>
  )
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        if (!f.length) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    setTimeout(() => ref.current?.querySelector<HTMLElement>('button, input')?.focus(), 30)
    return () => {
      document.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`animate-in flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-navy-900 shadow-2xl sm:rounded-2xl ${wide ? 'sm:max-w-6xl' : 'sm:max-w-xl'}`}
      >
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button type="button" className="btn-ghost -mr-2 px-2" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="scroll-thin overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
