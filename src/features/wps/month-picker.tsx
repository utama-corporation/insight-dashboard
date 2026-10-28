import { useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

const BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const

function labelPeriode(value: string): string {
  const [year, monthIdx] = value.split('-').map(Number) as [number, number]
  return `${BULAN[monthIdx - 1]} ${year}`
}

/**
 * Pemilih periode bulan: seluruh trigger membuka popover (bukan ikon kecil
 * bawaan browser). Nilai tetap 'YYYY-MM' — bentuk yang sama dengan periode
 * queryKey/period pada laporan.
 */
export function MonthPicker({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (next: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(() => Number(value.slice(0, 4)))
  const selectedYear = Number(value.slice(0, 4))
  const selectedMonth = Number(value.slice(5, 7))

  const pilih = (monthIdx: number) => {
    onChange(`${year}-${String(monthIdx + 1).padStart(2, '0')}`)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          // Label-in-Name (WCAG 2.5.3): nama aksesibel memuat teks yang terlihat.
          aria-label={`Pilih periode: ${labelPeriode(value)}`}
          className={cn('justify-between gap-2 font-normal', className)}
        >
          {labelPeriode(value)}
          <CalendarDays className='size-4 text-muted-foreground' />
        </Button>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-auto p-2'>
        <div className='mb-1 flex items-center justify-between px-1'>
          <Button
            variant='ghost'
            size='icon'
            aria-label='Tahun sebelumnya'
            className='size-7'
            onClick={() => setYear((y) => y - 1)}
          >
            <ChevronLeft />
          </Button>
          <p className='text-sm font-medium tabular-nums'>{year}</p>
          <Button
            variant='ghost'
            size='icon'
            aria-label='Tahun berikutnya'
            className='size-7'
            onClick={() => setYear((y) => y + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
        <div className='grid grid-cols-3 gap-1'>
          {BULAN.map((nama, i) => (
            <Button
              key={nama}
              variant={
                year === selectedYear && i + 1 === selectedMonth
                  ? 'default'
                  : 'ghost'
              }
              className='h-8 px-2 text-xs'
              onClick={() => pilih(i)}
            >
              {nama}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
