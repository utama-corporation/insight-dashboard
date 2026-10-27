import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ReportRow } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  MUTASI_KEYS,
  MUTASI_LABELS,
  largestCategory,
  lowestRendemen,
  topMover,
} from '../category-insights'

function CategoryCard({
  title,
  insight,
  insightId,
  chartId,
  children,
}: {
  title: string
  insight: string
  insightId: string
  chartId: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className='mb-3 rounded-md border bg-muted/40 px-3 py-1.5 text-xs'
          data-testid={insightId}
        >
          {insight}
        </p>
        <div className='h-64' data-testid={chartId}>
          <ResponsiveContainer width='100%' height='100%'>
            {children}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export function ProductionMachineChart({
  current,
  previous,
}: {
  current: ReportRow[]
  previous: ReportRow[]
}) {
  const dates = [...new Set(current.map((r) => String(r.Tanggal)))].sort()
  const machines = [...new Set(current.map((r) => String(r.NamaMesin)))]
  const data = dates.map((tanggal) => {
    const row: Record<string, string | number> = { tanggal }
    for (const mesin of machines) {
      row[mesin] = current
        .filter(
          (r) => String(r.Tanggal) === tanggal && String(r.NamaMesin) === mesin
        )
        .reduce((total, r) => total + (Number(r.Output) || 0), 0)
    }
    return row
  })
  const mover = topMover(current, previous, 'NamaMesin')

  return (
    <CategoryCard
      title='Produksi per Mesin (m³/hari)'
      insight={
        mover
          ? `Perubahan terbesar: ${mover.name} (${mover.delta > 0 ? '+' : ''}${mover.delta}%)`
          : 'Belum ada data perbandingan.'
      }
      insightId='insight-mesin'
      chartId='chart-produksi-mesin'
    >
      <LineChart data={data}>
        <CartesianGrid strokeDasharray='3 3' />
        <XAxis dataKey='tanggal' />
        <YAxis />
        <Tooltip />
        {machines.map((mesin, i) => (
          <Line
            key={mesin}
            type='monotone'
            dataKey={mesin}
            stroke={`hsl(${(i * 70) % 360} 70% 45%)`}
            dot={false}
          />
        ))}
      </LineChart>
    </CategoryCard>
  )
}

export function MutationCategoryChart({ current }: { current: ReportRow[] }) {
  const last = [...current].sort((a, b) =>
    String(a.Tanggal).localeCompare(String(b.Tanggal))
  )[current.length - 1]
  const data = last
    ? MUTASI_KEYS.map((key) => ({
        kategori: MUTASI_LABELS[key] ?? key,
        kg: Number(last[key]) || 0,
      }))
    : []
  const largest = largestCategory(current, [...MUTASI_KEYS])

  return (
    <CategoryCard
      title='Komposisi Mutasi per Kategori (kg)'
      insight={
        largest
          ? `Komposisi terbesar: ${largest.name} (${largest.value})`
          : 'Belum ada data mutasi.'
      }
      insightId='insight-mutasi'
      chartId='chart-mutasi-kategori'
    >
      <BarChart data={data} layout='vertical' margin={{ left: 40 }}>
        <XAxis type='number' />
        <YAxis type='category' dataKey='kategori' width={100} />
        <Tooltip />
        <Bar dataKey='kg' fill='hsl(150 60% 40%)' />
      </BarChart>
    </CategoryCard>
  )
}

export function RendemenGroupChart({ current }: { current: ReportRow[] }) {
  const groups = [...new Set(current.map((r) => String(r.GRP)))]
  const data = groups.map((grp) => {
    const rows = current.filter((r) => String(r.GRP) === grp)
    const input = rows.reduce((total, r) => total + (Number(r.Input) || 0), 0)
    const output = rows.reduce((total, r) => total + (Number(r.Output) || 0), 0)
    return { grp, pct: input === 0 ? 0 : Math.round((output / input) * 100) }
  })
  const lowest = lowestRendemen(current, 'GRP')

  return (
    <CategoryCard
      title='Rendemen per Grup Proses (%)'
      insight={
        lowest
          ? `Rendemen terendah: ${lowest.name} (${lowest.pct}%)`
          : 'Belum ada data rendemen.'
      }
      insightId='insight-rendemen'
      chartId='chart-rendemen-grp'
    >
      <BarChart data={data}>
        <CartesianGrid strokeDasharray='3 3' />
        <XAxis dataKey='grp' />
        <YAxis />
        <Tooltip />
        <Bar dataKey='pct' fill='hsl(210 60% 45%)' />
      </BarChart>
    </CategoryCard>
  )
}
