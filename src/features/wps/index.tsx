import { lazy, Suspense, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchReport } from '@/lib/api'
import {
  deltaPct,
  formatNumber,
  latestTotal,
  periodBounds,
  sumBy,
  weightedPct,
  type Period,
} from '@/lib/report-metrics'
import { Kpi, KpiStrip } from '@/components/kpi-strip'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ThemeSwitch } from '@/components/theme-switch'
import { rendemenAnomalies } from './category-insights'
import { labelPeriode } from './labels'
import { MonthPicker } from './month-picker'

const ProductionMachineChart = lazy(() =>
  import('./components/category-charts').then((m) => ({
    default: m.ProductionMachineChart,
  }))
)
const MutationCategoryChart = lazy(() =>
  import('./components/category-charts').then((m) => ({
    default: m.MutationCategoryChart,
  }))
)
const RendemenGroupChart = lazy(() =>
  import('./components/category-charts').then((m) => ({
    default: m.RendemenGroupChart,
  }))
)

function useReport(type: string, period: Period) {
  return useQuery({
    queryKey: ['wps', type, period],
    queryFn: () =>
      fetchReport('wps', type, {
        tglAwal: period.awal,
        tglAkhir: period.akhir,
      }),
    placeholderData: keepPreviousData,
  })
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
  const semuaLaporan = [
    produksiCur,
    produksiPrev,
    mutasiCur,
    mutasiPrev,
    rendemenCur,
    rendemenPrev,
  ]

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

  const loaded = semuaLaporan.every((laporan) => laporan.isSuccess)
  const failed = semuaLaporan.some((laporan) => laporan.isError)
  // keepPreviousData melaporkan status success + data periode LAMA selama
  // periode baru dimuat — tampilkan sebagai "memuat", bukan data terpilih.
  const memuat = semuaLaporan.some((laporan) => laporan.isPlaceholderData)

  const deltaProduksi = loaded ? deltaPct(outputCur, outputPrev) : undefined
  const anomalies = rendemenAnomalies(rendemenCur.data ?? [], 'GRP')
  const anomalyRows = anomalies.reduce((total, a) => total + a.rows, 0)
  const topAnomaly = anomalies[0]
  const labelBulan = labelPeriode(month)
  const labelBulanLalu = labelPeriode(prev.awal.slice(0, 7))
  let insight: string
  if (failed) {
    insight = 'Gagal memuat data. Periksa koneksi ke server.'
  } else if (memuat || deltaProduksi === undefined) {
    insight = 'Memuat data produksi…'
  } else if (deltaProduksi === 0) {
    insight = `Produksi ${labelBulan}: ${formatNumber(outputCur)} m³ — stabil dibanding ${labelBulanLalu} (${formatNumber(outputPrev)}).`
  } else {
    insight = `Produksi ${labelBulan}: ${formatNumber(outputCur)} m³ — ${
      deltaProduksi > 0 ? 'naik' : 'turun'
    } ${Math.abs(deltaProduksi)}% dibanding ${labelBulanLalu} (${formatNumber(outputPrev)}).`
  }

  return (
    <>
      <Header>
        <ThemeSwitch />
      </Header>
      <Main>
        <div className='mb-6 flex flex-wrap items-end justify-between gap-3'>
          <div>
            <h1 className='text-2xl font-semibold tracking-tight'>
              Wood Processing System
            </h1>
            <p className='mt-1 text-sm text-muted-foreground'>
              Produksi, rendemen, dan mutasi bahan per bulan
            </p>
          </div>
          <MonthPicker value={month} onChange={setMonth} className='h-9 w-40' />
        </div>

        <p
          className={
            failed ? 'text-base text-negative' : 'text-base text-foreground'
          }
          data-testid='insight-produksi'
        >
          {insight}
        </p>

        {loaded && !memuat && topAnomaly && (
          <p
            className='mt-3 rounded-md border border-warning-border bg-warning-surface px-3 py-2 text-xs text-warning'
            data-testid='insight-anomali'
          >
            Anomali data: {formatNumber(anomalyRows)} baris rendemen di atas
            100% (tertinggi {formatNumber(topAnomaly.maxPct)}% —{' '}
            {topAnomaly.name}
            {topAnomaly.maxDate && `, ${topAnomaly.maxDate}`}).
          </p>
        )}

        <KpiStrip
          className={
            'mt-5 sm:grid-cols-2 lg:grid-cols-4' + (memuat ? ' opacity-60' : '')
          }
        >
          <Kpi
            label='Total Produksi (m³)'
            value={loaded ? formatNumber(outputCur) : '—'}
            delta={deltaProduksi}
            tone='change'
            testId='kpi-total-produksi'
          />
          <Kpi
            label='Realisasi vs Target'
            value={loaded ? formatNumber(realisasiCur) : '—'}
            suffix={loaded ? '%' : undefined}
            delta={loaded ? realisasiCur - realisasiPrev : undefined}
            deltaUnit='pp'
            tone='change'
            testId='kpi-realisasi'
          />
          <Kpi
            label='Rendemen'
            value={loaded ? formatNumber(rendemenCurPct) : '—'}
            suffix={loaded ? '%' : undefined}
            delta={loaded ? rendemenCurPct - rendemenPrevPct : undefined}
            deltaUnit='pp'
            tone='change'
            testId='kpi-rendemen'
          />
          <Kpi
            label='Mutasi Total (kg)'
            value={loaded ? formatNumber(mutasiCurKg) : '—'}
            delta={loaded ? deltaPct(mutasiCurKg, mutasiPrevKg) : undefined}
            testId='kpi-mutasi'
          />
        </KpiStrip>

        {loaded && !memuat && (
          <Suspense
            fallback={
              <div className='mt-4 grid gap-4 lg:grid-cols-2'>
                <div className='h-64 w-full animate-pulse rounded-lg border bg-muted lg:col-span-2' />
                <div className='h-64 w-full animate-pulse rounded-lg border bg-muted' />
                <div className='h-64 w-full animate-pulse rounded-lg border bg-muted' />
              </div>
            }
          >
            <div className='mt-4 grid gap-4 lg:grid-cols-2'>
              <ProductionMachineChart
                className='lg:col-span-2'
                current={produksiCur.data ?? []}
                previous={produksiPrev.data ?? []}
              />
              <MutationCategoryChart current={mutasiCur.data ?? []} />
              <RendemenGroupChart current={rendemenCur.data ?? []} />
            </div>
          </Suspense>
        )}
      </Main>
    </>
  )
}
