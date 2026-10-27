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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { formatNumber, periodBounds, type Period } from '../wps/metrics'

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

  const chartData = trend.data ?? []
  const lastLoaded = (proses: Proses) => {
    const last =
      [...chartData].reverse().find((d) => Number(d[proses]) > 0) ??
      chartData[chartData.length - 1]
    return last ? Number(last[proses]) || 0 : 0
  }

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
                  {formatNumber(lastLoaded(proses))}
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
