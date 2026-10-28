import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ReportRow } from '@/lib/api'
import { formatNumber } from '@/lib/report-metrics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  MUTASI_KEYS,
  MUTASI_LABELS,
  largestCategory,
  lowestRendemen,
  lowestRealisasi,
  topMover,
} from '../category-insights'

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
  cursor: { fill: 'var(--muted)' },
}

function CategoryCard({
  title,
  insight,
  insightId,
  chartId,
  keterangan,
  className,
  children,
}: {
  title: string
  insight: string
  insightId: string
  chartId: string
  keterangan?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        <p className='text-xs text-muted-foreground' data-testid={insightId}>
          {insight}
        </p>
      </CardHeader>
      <CardContent>
        <div className='h-64 w-full' data-testid={chartId}>
          <ResponsiveContainer width='100%' height='100%'>
            {children}
          </ResponsiveContainer>
        </div>
        {keterangan && (
          <p
            className='mt-2 text-xs text-muted-foreground'
            data-testid={`keterangan-${chartId}`}
          >
            {keterangan}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/** Peringkat mesin menurut total output bulan ini; mesin dengan perubahan
 *  terbesar diberi warna data. */
export function ProductionMachineChart({
  current,
  previous,
  className,
}: {
  current: ReportRow[]
  previous: ReportRow[]
  className?: string
}) {
  const totals = new Map<string, number>()
  for (const row of current) {
    const name = String(row.NamaMesin)
    totals.set(name, (totals.get(name) ?? 0) + (Number(row.Output) || 0))
  }
  const data = [...totals]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
  const mover = topMover(current, previous, 'NamaMesin')
  const realisasi = lowestRealisasi(current, 'NamaMesin')

  return (
    <CategoryCard
      className={className}
      title='Total Produksi per Mesin (m³)'
      insight={
        mover || realisasi
          ? [
              mover &&
                `Perubahan terbesar: ${mover.name} (${mover.delta > 0 ? '+' : ''}${mover.delta}%)`,
              realisasi &&
                `Realisasi terendah: ${realisasi.name} (${realisasi.pct}%)`,
            ]
              .filter(Boolean)
              .join('. ')
          : 'Belum ada data perbandingan.'
      }
      insightId='insight-mesin'
      chartId='chart-produksi-mesin'
      keterangan='Biru = mesin dengan perubahan % terbesar vs bulan lalu (naik maupun turun); abu-abu = mesin lainnya. Panjang batang = total output bulan ini.'
    >
      <BarChart
        data={data}
        layout='vertical'
        margin={{ top: 0, right: 56, bottom: 0, left: 0 }}
        barCategoryGap='35%'
      >
        <XAxis type='number' hide />
        <YAxis
          type='category'
          dataKey='name'
          width={104}
          axisLine={false}
          tickLine={false}
          tick={tick}
        />
        <Tooltip
          {...tooltip}
          formatter={(value) => [`${formatNumber(Number(value))} m³`, '']}
        />
        <Bar
          dataKey='value'
          barSize={10}
          radius={5}
          fill='var(--chart-neutral)'
        >
          {data.map((row) => (
            <Cell
              key={row.name}
              fill={
                row.name === mover?.name
                  ? 'var(--chart-1)'
                  : 'var(--chart-neutral)'
              }
            />
          ))}
          <LabelList
            dataKey='value'
            position='right'
            formatter={(value: React.ReactNode) => formatNumber(Number(value))}
            style={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
          />
        </Bar>
      </BarChart>
    </CategoryCard>
  )
}

export function MutationCategoryChart({
  current,
  className,
}: {
  current: ReportRow[]
  className?: string
}) {
  const last = [...current].sort((a, b) =>
    String(a.Tanggal).localeCompare(String(b.Tanggal))
  )[current.length - 1]
  const data = last
    ? MUTASI_KEYS.map((key) => ({
        kategori: MUTASI_LABELS[key] ?? key,
        kg: Number(last[key]) || 0,
      })).sort((a, b) => b.kg - a.kg)
    : []
  const largest = largestCategory(current, [...MUTASI_KEYS])

  return (
    <CategoryCard
      className={className}
      title='Komposisi Mutasi per Kategori (m³)'
      insight={
        largest
          ? `Komposisi terbesar: ${largest.name} (${formatNumber(largest.value)})`
          : 'Belum ada data mutasi.'
      }
      insightId='insight-mutasi'
      chartId='chart-mutasi-kategori'
      keterangan='Semua batang abu-abu — chart ini murni peringkat komposisi stok akhir (m³) dan tidak menyorot satu kategori. KBKG (kayu bulat, satuannya kg) tidak dimasukkan.'
    >
      <BarChart
        data={data}
        layout='vertical'
        margin={{ top: 0, right: 56, bottom: 0, left: 0 }}
        barCategoryGap='35%'
      >
        <XAxis type='number' hide />
        <YAxis
          type='category'
          dataKey='kategori'
          width={112}
          axisLine={false}
          tickLine={false}
          tick={tick}
        />
        <Tooltip
          {...tooltip}
          formatter={(value) => [`${formatNumber(Number(value))} kg`, '']}
        />
        <Bar dataKey='kg' barSize={10} radius={5} fill='var(--chart-neutral)'>
          <LabelList
            dataKey='kg'
            position='right'
            formatter={(value: React.ReactNode) => formatNumber(Number(value))}
            style={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
          />
        </Bar>
      </BarChart>
    </CategoryCard>
  )
}

export function RendemenGroupChart({
  current,
  className,
}: {
  current: ReportRow[]
  className?: string
}) {
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
      className={className}
      title='Rendemen per Grup Proses (%)'
      insight={
        lowest
          ? `Rendemen terendah: ${lowest.name} (${lowest.pct}%)`
          : 'Belum ada data rendemen.'
      }
      insightId='insight-rendemen'
      chartId='chart-rendemen-grp'
      keterangan='Biru = grup proses dengan rendemen terendah (fokus perhatian); abu-abu = lainnya. Rendemen = Output ÷ Input × 100 tertimbang per grup.'
    >
      <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke='var(--border)' />
        <XAxis dataKey='grp' axisLine={false} tickLine={false} tick={tick} />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={tick}
          width={40}
          unit='%'
        />
        <Tooltip {...tooltip} formatter={(value) => [`${value}%`, '']} />
        <Bar dataKey='pct' barSize={28} radius={[2, 2, 0, 0]}>
          {data.map((row) => (
            <Cell
              key={row.grp}
              fill={
                row.grp === lowest?.name
                  ? 'var(--chart-1)'
                  : 'var(--chart-neutral)'
              }
            />
          ))}
        </Bar>
      </BarChart>
    </CategoryCard>
  )
}
