'use client'

import { Children, isValidElement, useId, type ButtonHTMLAttributes, type ChangeEvent, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import CustomDatePicker from '@/components/ui/CustomDatePicker'
import CustomSelect, { type SelectOption } from '@/components/ui/CustomSelect'
import { InfoHint } from '@/components/ui/InfoHint'

const labelCls = 'grid min-w-0 gap-1.5 text-xs font-bold text-foreground'
const controlCls = 'neu-inset min-h-11 w-full rounded-2xl border border-border/50 bg-surface-soft/60 px-3.5 text-base text-foreground outline-none transition-colors focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/15 sm:text-sm'

/** Los controles propios devuelven un evento mínimo para que las pantallas sigan leyendo `event.target.value`. */
const asEvent = <T extends HTMLElement>(value: string) => ({ target: { value }, currentTarget: { value } }) as unknown as ChangeEvent<T>

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`neu-raised rounded-3xl border border-border/40 bg-surface/70 p-5 sm:p-6 dark:bg-surface/60 ${className}`}>{children}</section> }
export function SectionTitle({ eyebrow, title, detail }: { eyebrow?: string; title: string; detail?: string }) { return <div className="mb-4">{eyebrow && <p className="text-[11px] font-bold uppercase tracking-widest text-accent-ink">{eyebrow}</p>}<h2 className="mt-1 text-balance text-lg font-semibold text-foreground">{title}</h2>{detail && <p className="mt-1 text-pretty text-sm text-muted-foreground">{detail}</p>}</div> }
export function Button({ children, variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'quiet' }) { return <button type="button" {...props} className={`min-h-11 rounded-2xl px-4 text-sm font-bold transition-[background-color,scale] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 ${variant === 'primary' ? 'bg-[#083A4F] text-white hover:bg-[#062c3c] dark:bg-[#C0D5D6] dark:text-[#083A4F] dark:hover:bg-[#a8c6c8]' : 'border border-border/60 bg-surface-soft/60 text-foreground hover:bg-surface'} ${props.className ?? ''}`}>{children}</button> }

function FieldLabel({ id, label, hint }: { id: string; label: string; hint?: string }) {
  return <div className="flex min-h-5 items-center gap-2"><label htmlFor={id}>{label}</label>{hint && <InfoHint label={label}>{hint}</InfoHint>}</div>
}

export function Field({ label, error, hint, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const generatedId = useId()
  const id = props.id ?? generatedId
  const control = props.type === 'date'
    ? <CustomDatePicker value={String(props.value ?? '')} onChange={value => props.onChange?.(asEvent<HTMLInputElement>(value))} label={label} placeholder={props.placeholder ?? 'Elegir'} required={props.required} disabled={props.disabled} className={controlCls} />
    : <input {...props} id={id} aria-invalid={Boolean(error)} className={controlCls} />
  return <div className={`${labelCls} ${className}`}>
    {props.type === 'date' ? <div className="flex min-h-5 items-center"><span>{label}</span></div> : <FieldLabel id={id} label={label} hint={hint} />}
    {control}
    {error && <span className="text-xs font-medium text-danger" role="alert">{error}</span>}
  </div>
}

const textOf = (node: ReactNode): string => Children.toArray(node).map(child => (typeof child === 'string' || typeof child === 'number' ? String(child) : isValidElement<{ children?: ReactNode }>(child) ? textOf(child.props.children) : '')).join('')

/** Convierte los <option> hijos en opciones; un "Seleccioná…" con valor vacío pasa a ser el placeholder. */
function optionsFrom(children: ReactNode): { options: SelectOption[]; placeholder?: string } {
  let placeholder: string | undefined
  const options: SelectOption[] = []
  Children.toArray(children).forEach(child => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode; disabled?: boolean; 'data-hint'?: string }>(child)) return
    const label = textOf(child.props.children)
    const value = child.props.value === undefined ? label : String(child.props.value)
    if (value === '' && /^seleccion/i.test(label)) { placeholder = label; return }
    options.push({ value, label, hint: child.props['data-hint'], disabled: child.props.disabled })
  })
  return { options, placeholder }
}

export function SelectField({ label, children, className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId()
  const { options, placeholder } = optionsFrom(children)
  return <div className={`${labelCls} ${className}`}>
    <label htmlFor={id}>{label}</label>
    <CustomSelect id={id} value={String(props.value ?? '')} options={options} placeholder={placeholder} disabled={props.disabled} onChange={value => props.onChange?.(asEvent<HTMLSelectElement>(value))} />
  </div>
}

/** Píldoras para elegir entre pocas opciones fijas: evita un desplegable cuando todo entra a la vista. */
export function SegmentedField<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void }) {
  return <div role="radiogroup" aria-label={label} className={labelCls}>
    <span aria-hidden="true">{label}</span>
    <div className="flex rounded-2xl border border-border/50 bg-surface-soft/60 p-1">
      {options.map(option => {
        const selected = option.value === value
        return <button key={option.value} type="button" role="radio" aria-checked={selected} onClick={() => onChange(option.value)} className={`min-h-9 flex-1 rounded-xl px-2 text-sm font-semibold transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${selected ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{option.label}</button>
      })}
    </div>
  </div>
}
