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

export const NumberField = ({ label, value, onChange, min = 0, max = 99, hint, info }: NumberFieldProps) => {
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

export const SelectField = <T extends string>({ label, value, options, onChange }: SelectFieldProps<T>) => {
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
  /** `tone` adds a color swatch, e.g. for terrain or firing arcs. */
  options: { value: T; label: string; tone?: string }[]
  onChange: (value: T) => void
  info?: ReactNode
  title?: string
}

export const Segmented = <T extends string | number>({ label, value, options, onChange, info, title }: SegmentedProps<T>) => {
  return (
    <div className="field" title={title}>
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
            className={`${o.value === value ? 'active' : ''} ${o.tone ? `toned tone-${o.tone}` : ''}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface SwitchProps<T extends string> {
  /** Accessible name of the group, e.g. "Mode". */
  label: string
  value: T
  options: { value: T; label: string; title?: string }[]
  onChange: (value: T) => void
}

/** Compact segmented switch without a visible label, e.g. in the header. */
export const Switch = <T extends string>({ label, value, options, onChange }: SwitchProps<T>) => {
  return (
    <div className="segmented header-switch" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className={o.value === value ? 'active' : ''} onClick={() => onChange(o.value)} title={o.title}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

interface ToggleProps {
  label: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  /** Tooltip explaining the option. */
  title?: string
  disabled?: boolean
}

export const Toggle = ({ label, checked, onChange, title, disabled }: ToggleProps) => {
  return (
    <label className={`toggle ${disabled ? 'toggle-disabled' : ''}`} title={title}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
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
  /** Buttons shown at the right end of the header. */
  actions?: ReactNode
  className?: string
}

export const CollapsiblePanel = ({ id, title, summary, children, actions, className = '' }: CollapsiblePanelProps) => {
  const [collapsed, setCollapsed] = usePersistentState(`btc-collapsed-${id}`, () => false)
  return (
    <section className={`panel collapsible ${collapsed ? 'collapsed' : ''} ${className}`}>
      <header className="panel-header">
        <button type="button" className="collapse-toggle" aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>
          <Chevron open={!collapsed} />
          <h2>{title}</h2>
        </button>
        {collapsed && summary && <span className="panel-summary">{summary}</span>}
        {actions}
      </header>
      {!collapsed && <div className="panel-body">{children}</div>}
    </section>
  )
}

export const Panel = ({ title, children, actions, className = '' }: { title: string; children: ReactNode; actions?: ReactNode; className?: string }) => {
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
export const Chevron = ({ open }: { open: boolean }) => {
  return (
    <span className={`caret ${open ? 'open' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 16 16" width="16" height="16">
        <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}
