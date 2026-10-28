import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchReport } from '@/lib/api'
import { deltaPct, formatNumber, periodBounds } from '@/lib/report-metrics'
import { Kpi, KpiStrip } from '@/components/kpi-strip'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ThemeSwitch } from '@/components/theme-switch'

const PROSES = [
  { proses: 'broker', label: 'Broker' },
  { proses: 'crusher', label: 'Crusher' },
  { proses: 'gilingan', label: 'Gilingan' },
  { proses: 'mixer', label: 'Mixer' },
  { proses: 'washing', label: 'Washing' },
] as const

type Proses = (typeof PROSES)[number]['proses']

const tick = { fontSize: 12, fill: 'var(--muted-foreground)' }
const tooltip = {
  contentStyle: {
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--popover)',
    color: 'var(--popover-foreground)',
    fontSize: 12,
    padding: '6px 8px',
  },
  labelStyle: { color: 'var(--muted-foreground)' },
  itemStyle: { color: 'var(--foreground)' },
}

/** Tanggal `i` hari sebelum `end` (inklusif). */
function daysBefore(end: string, i: number): string {
  const date = new Date(`${end}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - i)
  return date.toISOString().slice(0, 10)
}

/** dd/MM — urutan hari tetap terbaca tanpa bergantung pada locale. */
const dayLabel = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

type TrendRow = { tanggal: string; label: string } & Record<Proses, number>

export function PpsPage({ initialMonth }: { initialMonth?: string }) {
  // Tren 7 hari tidak difilter per bulan — selalu 7 hari terakhir sampai
  // tanggal akhir yang dipilih (default: hari ini).
  const [endDate] = useState(
    initialMonth
      ? periodBounds(initialMonth).cur.akhir
      : new Date().toISOString().slice(0, 10)
  )

  // Trend 7 hari terakhir: 1 snapshot per proses per hari.
  const trendDays = [6, 5, 4, 3, 2, 1, 0].map((i) => daysBefore(endDate, i))
  const trend = useQuery({
    queryKey: ['pps', 'trend', trendDays],
    queryFn: async () => {
      const rows = await Promise.all(
        trendDays.flatMap((tanggal) =>
          PROSES.map(async ({ proses }) => ({
            tanggal,
            proses,
            berat: (
              await fetchReport('pps', `rekap-produksi-${proses}`, {
                perTgl: tanggal,
              })
            ).reduce((total, row) => total + (Number(row.Berat) || 0), 0),
          }))
        )
      )
      return trendDays.map((tanggal) => {
        const day: TrendRow = {
          tanggal,
          label: dayLabel(tanggal),
          broker: 0,
          crusher: 0,
          gilingan: 0,
          mixer: 0,
          washing: 0,
        }
        for (const { proses } of PROSES) {
          day[proses] =
            rows.find((r) => r.tanggal === tanggal && r.proses === proses)
              ?.berat ?? 0
        }
        return day
      })
    },
  })

  // shortcut: 1 call per proses per hari (35 call/paket 7 hari), belum ada
  // SP periode teragregasi — ganti saat whitelist SP periode tervalidasi (#9)
  const chartData = trend.data ?? []
  const lastPoint = (proses: Proses) => {
    const row = [...chartData].reverse().find((d) => Number(d[proses]) > 0)
    return row
      ? { value: Number(row[proses]), date: dayLabel(row.tanggal) }
      : undefined
  }

  // Insight rule-based dari data tren yang sudah ada: rata-rata 3 hari
  // terakhir vs 3 hari sebelumnya.
  const totalPerDay = chartData.map((day) =>
    PROSES.reduce((total, { proses }) => total + day[proses], 0)
  )
  const avg = (rows: number[]) =>
    rows.length === 0
      ? 0
      : rows.reduce((total, v) => total + v, 0) / rows.length
  const last3 = avg(totalPerDay.slice(-3))
  const prev3 = avg(totalPerDay.slice(-6, -3))
  const deltaTren = last3 > 0 || prev3 > 0 ? deltaPct(last3, prev3) : 0
  const insight = trend.isError
    ? 'Gagal memuat data. Periksa koneksi ke server.'
    : trend.isLoading
      ? 'Memuat data produksi…'
      : deltaTren === 0
        ? 'Produksi plastik stabil dalam 7 hari terakhir.'
        : `Produksi plastik ${deltaTren > 0 ? 'naik' : 'turun'} ${Math.abs(deltaTren)}% dalam 7 hari terakhir.`

  return (
    <>
      <Header>
        <ThemeSwitch />
      </Header>
      <Main>
        <div className='mb-6 flex flex-wrap items-end justify-between gap-3'>
          <div>
            <h1 className='text-2xl font-semibold tracking-tight'>
              Plastic Production System
            </h1>
            <p className='mt-1 text-sm text-muted-foreground'>
              Output per proses, 7 hari terakhir (sampai {endDate})
            </p>
          </div>
        </div>

        <p
          className={
            trend.isError
              ? 'text-base text-negative'
              : 'text-base text-foreground'
          }
          data-testid='insight-produksi'
        >
          {insight}
        </p>

        <KpiStrip className='mt-5 sm:grid-cols-2 lg:grid-cols-5 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1'>
          {PROSES.map(({ proses, label }) => {
            const point = lastPoint(proses)
            return (
              <Kpi
                key={proses}
                label={`${label} (kg)`}
                value={trend.isSuccess ? formatNumber(point?.value ?? 0) : '—'}
                caption={point ? `per ${point.date}` : '7 hari terakhir'}
                testId={`kpi-proses-${proses}`}
              />
            )
          })}
        </KpiStrip>

        <div className='mt-4 rounded-lg border bg-card p-5'>
          <div className='mb-2 flex flex-wrap items-baseline justify-between gap-2'>
            <h2 className='text-sm font-medium'>
              Tren Produksi Harian per Proses (kg)
            </h2>
            <p className='text-xs text-muted-foreground'>7 hari, kg</p>
          </div>
          <div data-testid='tren-produksi-pps' className='h-80 w-full'>
            <ResponsiveContainer width='100%' height='100%'>
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid vertical={false} stroke='var(--border)' />
                <XAxis
                  dataKey='label'
                  axisLine={false}
                  tickLine={false}
                  tick={tick}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={tick}
                  width={52}
                />
                <Tooltip
                  {...tooltip}
                  formatter={(value, name) => [
                    `${formatNumber(Number(value))} kg`,
                    name,
                  ]}
                />
                <Legend
                  verticalAlign='top'
                  align='left'
                  iconType='circle'
                  iconSize={6}
                  wrapperStyle={{ fontSize: 12, paddingBottom: 12 }}
                  formatter={(value) => (
                    <span style={{ color: 'var(--muted-foreground)' }}>
                      {value}
                    </span>
                  )}
                />
                {PROSES.map(({ proses, label }, i) => (
                  <Line
                    key={proses}
                    type='linear'
                    dataKey={proses}
                    name={label}
                    stroke={`var(--chart-${i + 1})`}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Main>
    </>
  )
}
