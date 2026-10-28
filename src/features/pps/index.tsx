import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchReport } from '@/lib/api'
import {
  deltaPct,
  formatNumber,
  periodBounds,
  type Period,
} from '@/lib/report-metrics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

const topNav = [{ title: 'PPS', href: '/pps', isActive: true }]

const PROSES = [
  { proses: 'broker', label: 'Broker' },
  { proses: 'crusher', label: 'Crusher' },
  { proses: 'gilingan', label: 'Gilingan' },
  { proses: 'mixer', label: 'Mixer' },
  { proses: 'washing', label: 'Washing' },
] as const

type Proses = (typeof PROSES)[number]['proses']

/** Tanggal `i` hari sebelum akhir periode (inklusif akhir). */
function dayBefore(period: Period, i: number): string {
  const date = new Date(`${period.akhir}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - i)
  return date.toISOString().slice(0, 10)
}

type TrendRow = { tanggal: string } & Record<Proses, number>

export function PpsPage({ initialMonth }: { initialMonth?: string }) {
  const [month, setMonth] = useState(
    initialMonth ?? new Date().toISOString().slice(0, 7)
  )
  const { cur } = periodBounds(month)

  // Trend 7 hari terakhir periode: 1 snapshot per proses per hari.
  const trendDays = [6, 5, 4, 3, 2, 1, 0].map((i) => dayBefore(cur, i))
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
  const lastNonZero = (proses: Proses) => {
    const last =
      [...chartData].reverse().find((d) => Number(d[proses]) > 0) ??
      chartData[chartData.length - 1]
    return last ? Number(last[proses]) || 0 : 0
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
  const insight = trend.isLoading
    ? 'Memuat data produksi…'
    : deltaTren === 0
      ? 'Produksi plastik stabil dalam 7 hari terakhir.'
      : `Produksi plastik ${deltaTren > 0 ? 'naik' : 'turun'} ${Math.abs(deltaTren)}% dalam 7 hari terakhir.`

  return (
    <>
      <Header>
        <TopNav links={topNav} className='me-auto' />
        <Search />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>
      <Main>
        <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
          <h1 className='text-2xl font-bold tracking-tight'>
            Plastic Production System
          </h1>
          <Input
            type='month'
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            className='w-44'
            aria-label='Pilih periode'
          />
        </div>

        <p
          className='mb-4 rounded-md border bg-muted/40 px-4 py-2 text-sm'
          data-testid='insight-produksi'
        >
          {insight}
        </p>

        <div className='mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5'>
          {PROSES.map(({ proses, label }) => (
            <Card key={proses}>
              <CardHeader>
                <CardTitle className='text-sm font-medium text-muted-foreground'>
                  {label} (kg)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className='text-2xl font-bold'
                  data-testid={`kpi-proses-${proses}`}
                >
                  {trend.isLoading ? '—' : formatNumber(lastNonZero(proses))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tren Produksi Harian per Proses (7 hari, kg)</CardTitle>
          </CardHeader>
          <CardContent>
            <div data-testid='tren-produksi-pps' className='h-72'>
              <ResponsiveContainer width='100%' height='100%'>
                <LineChart data={chartData}>
                  <XAxis dataKey='tanggal' />
                  <YAxis />
                  <Tooltip />
                  {PROSES.map(({ proses, label }, i) => (
                    <Line
                      key={proses}
                      type='monotone'
                      dataKey={proses}
                      name={label}
                      stroke={`hsl(${i * 60} 70% 45%)`}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
