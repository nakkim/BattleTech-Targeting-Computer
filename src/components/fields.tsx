import type { ReactNode } from 'react'
import { usePersistentState } from '../state/usePersistentState'

interface NumberFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  hint?: string
  /** Extra control shown next to the label, e.g. an info button. */
  info?: ReactNode
}

export function NumberField({ label, value, onChange, min = 0, max = 99, hint, info }: NumberFieldProps) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {info}
      </span>
      <span className="stepper">
        <button type="button" onClick={() => onChange(clamp(value - 1))} aria-label={`Decrease ${label}`}>
          –
        </button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const v = Number(e.target.value)
            if (!Number.isNaN(v)) onChange(clamp(v))
          }}
        />
        <button type="button" onClick={() => onChange(clamp(value + 1))} aria-label={`Increase ${label}`}>
          +
        </button>
      </span>
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

interface SelectFieldProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}

export function SelectField<T extends string>({ label, value, options, onChange }: SelectFieldProps<T>) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

interface SegmentedProps<T extends string | number> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  info?: ReactNode
}

export function Segmented<T extends string | number>({ label, value, options, onChange, info }: SegmentedProps<T>) {
  return (
    <div className="field">
      <span className="field-label">
        {label}
        {info}
      </span>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            className={o.value === value ? 'active' : ''}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface ToggleProps {
  label: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

interface CollapsiblePanelProps {
  /** Key used to remember the collapsed state. */
  id: string
  title: string
  /** Shown in the header while collapsed. */
  summary?: ReactNode
  children: ReactNode
  className?: string
}

export function CollapsiblePanel({ id, title, summary, children, className = '' }: CollapsiblePanelProps) {
  const [collapsed, setCollapsed] = usePersistentState(`btc-collapsed-${id}`, () => false)
  return (
    <section className={`panel collapsible ${collapsed ? 'collapsed' : ''} ${className}`}>
      <header className="panel-header">
        <button type="button" className="collapse-toggle" aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>
          <Chevron open={!collapsed} />
          <h2>{title}</h2>
        </button>
        {collapsed && summary && <span className="panel-summary">{summary}</span>}
      </header>
      {!collapsed && <div className="panel-body">{children}</div>}
    </section>
  )
}

export function Panel({ title, children, actions, className = '' }: { title: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-header">
        <h2>{title}</h2>
        {actions}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  )
}

/** Expand/collapse indicator: points right when closed, down when open. */
export function Chevron({ open }: { open: boolean }) {
  return (
    <span className={`caret ${open ? 'open' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 16 16" width="16" height="16">
        <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}
