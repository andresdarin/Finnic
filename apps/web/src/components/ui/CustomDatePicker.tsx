'use client'

import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { useFloatingPopover } from './useFloatingPopover'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  required?: boolean
  disabled?: boolean
  /** Nombre del campo para lectores de pantalla, p. ej. "Fecha del gasto". */
  label?: string
}

const triggerBase = 'neu-inset h-11 rounded-xl border border-border bg-surface-soft px-4 text-sm font-medium text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const DAYS_OF_WEEK = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO']

function getDaysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate()
}

function getFirstDayOfWeek(y: number, m: number) {
  const day = new Date(y, m, 1).getDay()
  return day === 0 ? 6 : day - 1 // 0 = Lunes, ..., 6 = Domingo
}

function formatYMD(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return 'Seleccionar fecha'
  const parts = dateStr.split('-').map(Number)
  if (parts.length < 3 || parts.some(isNaN)) return 'Seleccionar fecha'
  const [y, m, d] = parts as [number, number, number]
  const monthsAbbr = ['Ene.', 'Feb.', 'Mar.', 'Abr.', 'May.', 'Jun.', 'Jul.', 'Ago.', 'Sep.', 'Oct.', 'Nov.', 'Dic.']
  return `${d} ${monthsAbbr[m - 1]} ${y}`
}

export default function CustomDatePicker({
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  className = '',
  required = false,
  disabled = false,
  label
}: Props) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popoverStyle = useFloatingPopover(btnRef, 'data-dp', 280, 320, open, () => setOpen(false))

  const todayStr = formatYMD(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())

  const [viewYear, setViewYear] = useState(() => {
    const parts = (value || todayStr).split('-').map(Number)
    return parts[0] || new Date().getFullYear()
  })
  
  const [viewMonth, setViewMonth] = useState(() => {
    const parts = (value || todayStr).split('-').map(Number)
    return (parts[1] ? parts[1] - 1 : new Date().getMonth())
  })

  // Sincronizar vista si el valor externo cambia
  useEffect(() => {
    if (value) {
      const parts = value.split('-').map(Number)
      const y = parts[0]
      const m = parts[1]
      if (typeof y === 'number' && typeof m === 'number' && !isNaN(y) && !isNaN(m)) {
        setViewYear(y)
        setViewMonth(m - 1)
      }
    }
  }, [value])

  const daysInCurrentMonth = getDaysInMonth(viewYear, viewMonth)
  const daysInPrevMonth = getDaysInMonth(viewYear, viewMonth - 1)
  const firstDayIndex = getFirstDayOfWeek(viewYear, viewMonth)

  const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = []

  // Rellenar días del mes anterior
  let prevYear = viewYear
  let prevMonth = viewMonth - 1
  if (prevMonth < 0) {
    prevMonth = 11
    prevYear--
  }
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    cells.push({
      dateStr: formatYMD(prevYear, prevMonth, d),
      dayNum: d,
      isCurrentMonth: false
    })
  }

  // Días del mes actual
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    cells.push({
      dateStr: formatYMD(viewYear, viewMonth, d),
      dayNum: d,
      isCurrentMonth: true
    })
  }

  // Rellenar días del mes siguiente
  let nextYear = viewYear
  let nextMonth = viewMonth + 1
  if (nextMonth > 11) {
    nextMonth = 0
    nextYear++
  }
  let nextMonthDay = 1
  while (cells.length < 42) {
    cells.push({
      dateStr: formatYMD(nextYear, nextMonth, nextMonthDay),
      dayNum: nextMonthDay,
      isCurrentMonth: false
    })
    nextMonthDay++
  }

  function handlePrevMonth() {
    setViewMonth(m => {
      if (m === 0) {
        setViewYear(y => y - 1)
        return 11
      }
      return m - 1
    })
  }

  function handleNextMonth() {
    setViewMonth(m => {
      if (m === 11) {
        setViewYear(y => y + 1)
        return 0
      }
      return m + 1
    })
  }

  function handleSelect(dateStr: string) {
    onChange(dateStr)
    setOpen(false)
  }

  function handleToday() {
    const today = new Date()
    const tStr = formatYMD(today.getFullYear(), today.getMonth(), today.getDate())
    onChange(tStr)
    setOpen(false)
  }

  function handleClear() {
    if (!required) {
      onChange('')
      setOpen(false)
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={`${triggerBase} ${className} flex items-center justify-between gap-2`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label ? `${label}: ${value ? formatDisplayDate(value) : placeholder ?? 'sin elegir'}` : undefined}
      >
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && createPortal(
        <div data-dp role="dialog" aria-modal="true" aria-label="Seleccionar fecha" style={popoverStyle}>
          <div
            className="w-[280px] liquid-glass p-4"
            data-intensity="medium"
            data-variant="card"
            style={{
              background: 'color-mix(in oklch, var(--background) 75%, transparent)',
              backdropFilter: 'blur(40px) saturate(180%) contrast(1.05)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%) contrast(1.05)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <div className="flex gap-0.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-surface-soft hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  aria-label="Mes anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-surface-soft hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  aria-label="Mes siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Days of Week */}
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-bold tracking-wider text-muted-foreground">
              {DAYS_OF_WEEK.map(day => (
                <div key={day}>{day}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map(({ dateStr, dayNum, isCurrentMonth }) => {
                const isSelected = value === dateStr
                const isToday = todayStr === dateStr
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => handleSelect(dateStr)}
                    className={`h-8 w-8 rounded-xl text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : isToday
                        ? 'border border-primary bg-primary/5 text-primary'
                        : isCurrentMonth
                        ? 'text-foreground hover:bg-surface-soft'
                        : 'text-muted-foreground hover:bg-surface-soft/50'
                    }`}
                  >
                    {dayNum}
                  </button>
                )
              })}
            </div>

            {/* Footer */}
            <div className="mt-3 flex gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={handleToday}
                className="flex-1 rounded-xl bg-surface-soft px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                Hoy
              </button>
              {!required && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex-1 rounded-xl bg-surface-soft px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  Borrar
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
