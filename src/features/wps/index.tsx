import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchReport } from '@/lib/api'
import {
  deltaPct,
  formatDelta,
  formatNumber,
  latestTotal,
  periodBounds,
  sumBy,
  weightedPct,
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

const topNav = [{ title: 'WPS', href: '/wps', isActive: true }]

function useReport(type: string, period: Period) {
  return useQuery({
    queryKey: ['wps', type, period],
    queryFn: () =>
      fetchReport('wps', type, {
        tglAwal: period.awal,
        tglAkhir: period.akhir,
      }),
  })
}

function KpiCard({
  label,
  value,
  suffix,
  delta,
  deltaUnit = 'percent',
  testId,
}: {
  label: string
  value: string
  suffix?: string
  delta: number | undefined
  // 'percent' = Δ relatif; 'pp' = perbedaan poin persentase
  deltaUnit?: 'percent' | 'pp'
  testId: string
}) {
  const deltaText =
    delta === undefined
      ? undefined
      : deltaUnit === 'pp'
        ? `${delta > 0 ? '+' : ''}${delta} pp`
        : formatDelta(delta)
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-sm font-medium text-muted-foreground'>
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold' data-testid={testId}>
          {value}
          {suffix}
        </div>
        {deltaText !== undefined && (
          <p
            className='text-xs text-muted-foreground'
            data-testid={`delta-${testId.replace('kpi-', '')}`}
          >
            {deltaText} vs periode sebelumnya
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function WpsPage({ initialMonth }: { initialMonth?: string }) {
  const [month, setMonth] = useState(
    initialMonth ?? new Date().toISOString().slice(0, 7)
  )
  const { cur, prev } = periodBounds(month)

  const produksiCur = useReport('produksi-semua-mesin', cur)
  const produksiPrev = useReport('produksi-semua-mesin', prev)
  const mutasiCur = useReport('rekap-mutasi', cur)
  const mutasiPrev = useReport('rekap-mutasi', prev)
  const rendemenCur = useReport('rendemen-semua-proses', cur)
  const rendemenPrev = useReport('rendemen-semua-proses', prev)

  const outputCur = sumBy(produksiCur.data ?? [], 'Output')
  const outputPrev = sumBy(produksiPrev.data ?? [], 'Output')
  const realisasiCur = weightedPct(produksiCur.data ?? [], 'Output', 'Target')
  const realisasiPrev = weightedPct(produksiPrev.data ?? [], 'Output', 'Target')
  const rendemenCurPct = weightedPct(rendemenCur.data ?? [], 'Output', 'Input')
  const rendemenPrevPct = weightedPct(
    rendemenPrev.data ?? [],
    'Output',
    'Input'
  )
  const mutasiCurKg = latestTotal(mutasiCur.data ?? [], 'TotalAkhir')
  const mutasiPrevKg = latestTotal(mutasiPrev.data ?? [], 'TotalAkhir')

  const loaded =
    produksiCur.isSuccess &&
    produksiPrev.isSuccess &&
    mutasiCur.isSuccess &&
    mutasiPrev.isSuccess &&
    rendemenCur.isSuccess &&
    rendemenPrev.isSuccess

  const deltaProduksi = loaded ? deltaPct(outputCur, outputPrev) : undefined
  const insight =
    deltaProduksi === undefined
      ? 'Memuat data produksi…'
      : deltaProduksi === 0
        ? 'Produksi stabil dibanding periode sebelumnya.'
        : `Produksi ${deltaProduksi > 0 ? 'naik' : 'turun'} ${Math.abs(deltaProduksi)}% dibanding periode sebelumnya.`

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
            Wood Processing System
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

        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <KpiCard
            label='Total Produksi (m³)'
            value={formatNumber(outputCur)}
            delta={deltaProduksi}
            testId='kpi-total-produksi'
          />
          <KpiCard
            label='Realisasi vs Target'
            value={formatNumber(realisasiCur)}
            suffix='%'
            delta={loaded ? realisasiCur - realisasiPrev : undefined}
            deltaUnit='pp'
            testId='kpi-realisasi'
          />
          <KpiCard
            label='Rendemen'
            value={formatNumber(rendemenCurPct)}
            suffix='%'
            delta={loaded ? rendemenCurPct - rendemenPrevPct : undefined}
            deltaUnit='pp'
            testId='kpi-rendemen'
          />
          <KpiCard
            label='Mutasi Total (kg)'
            value={formatNumber(mutasiCurKg)}
            delta={loaded ? deltaPct(mutasiCurKg, mutasiPrevKg) : undefined}
            testId='kpi-mutasi'
          />
        </div>
      </Main>
    </>
  )
}
