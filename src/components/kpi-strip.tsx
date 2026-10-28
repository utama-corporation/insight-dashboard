import { formatDelta, formatNumber } from '@/lib/report-metrics'
import { cn } from '@/lib/utils'

/** Satu kontainer dibagi garis rambut — bukan empat kartu berikon. */
export function KpiStrip({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={cn(
        'grid gap-px overflow-hidden rounded-lg border bg-border',
        className
      )}
    >
      {children}
    </section>
  )
}

type KpiProps = {
  label: string
  value: string
  suffix?: string
  delta?: number
  // 'percent' = Δ relatif; 'pp' = perbedaan poin persentase
  deltaUnit?: 'percent' | 'pp'
  // 'change' mewarnai angka Δ sesuai tanda; 'neutral' menyisakan tinta abu-abu
  tone?: 'change' | 'neutral'
  caption?: string
  testId: string
}

export function Kpi({
  label,
  value,
  suffix,
  delta,
  deltaUnit = 'percent',
  tone = 'neutral',
  caption = 'vs periode sebelumnya',
  testId,
}: KpiProps) {
  const deltaText =
    delta === undefined
      ? undefined
      : deltaUnit === 'pp'
        ? `${delta > 0 ? '+' : ''}${formatNumber(delta)} pp`
        : formatDelta(delta)

  return (
    <div className='bg-card px-5 py-4'>
      <p className='text-xs text-muted-foreground'>{label}</p>
      <p
        className='mt-2 text-3xl font-medium tracking-tight tabular-nums'
        data-testid={testId}
      >
        {value}
        {suffix}
      </p>
      <p
        className='mt-1 text-xs text-muted-foreground'
        data-testid={`delta-${testId.replace('kpi-', '')}`}
      >
        {deltaText && (
          <>
            <span
              className={cn(
                'tabular-nums',
                tone === 'change' &&
                  (delta! > 0
                    ? 'text-positive'
                    : delta! < 0
                      ? 'text-negative'
                      : '')
              )}
            >
              {deltaText}
            </span>{' '}
            ·{' '}
          </>
        )}
        {caption}
      </p>
    </div>
  )
}
