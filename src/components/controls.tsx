import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

const FIELD =
  'rounded-[6px] border border-line-strong bg-surface px-2 py-[5px] text-[12px] text-ink-1 placeholder:text-ink-4 focus:border-maroon focus:outline-none'

export function TextInput({
  label,
  hint,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-4">
        {label}
      </span>
      <input {...props} className={FIELD} />
      {hint && <span className="text-[10px] text-ink-4">{hint}</span>}
    </label>
  )
}

export function Select({
  label,
  children,
  className = '',
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-4">
        {label}
      </span>
      <select {...props} className={FIELD}>
        {children}
      </select>
    </label>
  )
}

export function Button({
  children,
  variant = 'default',
  onClick,
  type = 'button',
  disabled,
  title,
}: {
  children: ReactNode
  variant?: 'default' | 'primary' | 'quiet'
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  title?: string
}) {
  const variants = {
    default:
      'border-line-strong bg-surface text-ink-2 enabled:hover:bg-sunken',
    primary: 'border-maroon bg-maroon text-white enabled:hover:bg-maroon-hover',
    quiet: 'border-transparent bg-transparent text-ink-3 enabled:hover:bg-sunken',
  } as const
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-[6px] border px-2.5 py-[5px] text-[12px] font-medium disabled:opacity-40 ${variants[variant]}`}
    >
      {children}
    </button>
  )
}

/** Segmented control for mutually exclusive views. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: Array<{ value: T; label: string; count?: number }>
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex rounded-[7px] border border-line-strong bg-sunken p-[2px]"
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={selected}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-[5px] px-2.5 py-[3px] text-[12px] font-medium ${
              selected ? 'bg-surface text-ink-1 shadow-xs' : 'text-ink-3 hover:text-ink-2'
            }`}
          >
            {option.label}
            {option.count !== undefined && (
              <span className="tnum ml-1.5 text-[11px] text-ink-4">{option.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[12px] text-ink-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-3.5 accent-maroon"
      />
      <span>
        {label}
        {hint && <span className="ml-1.5 text-[11px] text-ink-4">{hint}</span>}
      </span>
    </label>
  )
}

/** Metadata chip: a label and its value side by side. */
export function Chip({
  label,
  children,
  mono = false,
}: {
  label: string
  children: ReactNode
  mono?: boolean
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-[6px] border border-line bg-sunken px-2 py-[2px] text-[11px]">
      <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-4">
        {label}
      </span>
      <span className={`text-ink-2 ${mono ? 'font-mono text-[11px]' : ''}`}>{children}</span>
    </span>
  )
}
