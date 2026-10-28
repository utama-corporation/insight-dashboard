import { useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
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
import { fetchReport, type CatalogItem, type ReportRow } from '@/lib/api'
import { formatNumber } from '@/lib/report-metrics'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Kpi, KpiStrip } from '@/components/kpi-strip'

const tick = { fontSize: 11, fill: 'var(--muted-foreground)' }
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
}

const today = () => new Date().toISOString().slice(0, 10)
const awalBulan = () => `${today().slice(0, 7)}-01`
const isNumeric = (rows: ReportRow[], col: string) =>
  rows.some((r) => typeof r[col] === 'number') &&
  rows.every(
    (r) =>
      r[col] == null ||
      typeof r[col] === 'number' ||
      Number.isFinite(Number(r[col]))
  )

function deteksiKolom(rows: ReportRow[]) {
  if (rows.length === 0)
    return { tanggal: undefined, dimensi: undefined, ukur: [] as string[] }
  const cols = Object.keys(rows[0])
  const tanggal = cols.find((c) => /tanggal|tgl|perTgl/i.test(c))
  const ukur = cols.filter(
    (c) => c !== tanggal && isNumeric(rows, c) && !/(^id$|id$|^no)/i.test(c)
  )
  const dimensi = cols.find((c) => c !== tanggal && !ukur.includes(c))
  return { tanggal, dimensi, ukur: ukur.slice(0, 3) }
}

const unitDari = (judul: string) => {
  const m = judul.match(
    /(\d+\s*(?:kg|m³|ton|%|pcs)|Rp|\bm³\b|\bkg\b|\bton\b|\bpcs\b)/i
  )
  return m ? m[1].replace(/^\d+\s*/, '') : ''
}

/** Halaman laporan generik: params sesuai bentuk SP + visual & insight otomatis. */
export function ReportView({
  system,
  item,
}: {
  system: 'wps' | 'pps'
  item: CatalogItem
}) {
  const defaults = useMemo(() => {
    const d: Record<string, string> = {}
    for (const p of item.params) {
      if (p.type === 'date') d[p.name] = today()
      else if (p.type === 'int') d[p.name] = '0'
      else d[p.name] = ''
    }
    if (item.shape === 'period')
      d[item.params[0]?.name || 'tglAwal'] = awalBulan()
    return d
  }, [item])
  const [params, setParams] = useState(defaults)
  const [draft, setDraft] = useState(defaults)

  const bisaAuto =
    item.shape === 'period' || item.shape === 'asof' || item.shape === 'none'
  const queryKey = ['laporan', system, item.type, params] as const

  const laporan = useQuery({
    queryKey,
    queryFn: () => fetchReport(system, item.type, params),
    enabled: bisaAuto,
    placeholderData: keepPreviousData,
    retry: false,
  })

  // Periode pembanding (hanya bentuk period): jendela sama panjang sebelumnya.
  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  const prev = useQuery({
    queryKey: [...queryKey, 'prev'],
    queryFn: () => {
      const ms = (d: string) => Date.parse(d + 'T00:00:00Z')
      const [a, b] = item.params.map((p) => p.name)
      const panjang = Math.round((ms(params[b]) - ms(params[a])) / 86400000)
      const akhir2 = new Date(ms(params[a]) - 86400000)
        .toISOString()
        .slice(0, 10)
      const awal2 = new Date(ms(params[a]) - 86400000 - panjang * 86400000)
        .toISOString()
        .slice(0, 10)
      return fetchReport(system, item.type, { [a]: awal2, [b]: akhir2 })
    },
    enabled: bisaAuto && item.shape === 'period',
    placeholderData: keepPreviousData,
    retry: false,
  })

  const rows = useMemo(() => laporan.data ?? [], [laporan.data])
  const { tanggal, dimensi, ukur } = useMemo(() => deteksiKolom(rows), [rows])
  const unit = unitDari(item.judul)

  const sumOf = (rows2: ReportRow[], col: string) =>
    rows2.reduce((t, r) => t + (Number(r[col]) || 0), 0)

  const insight = useMemo(() => {
    if (laporan.isError)
      return 'Gagal memuat. Laporan ini menunggu grant EXECUTE atau SP tidak tersedia.'
    if (laporan.isLoading || rows.length === 0) return 'Memuat data…'
    const bagian: string[] = []
    if (ukur.length > 0) {
      const cur = sumOf(rows, ukur[0])
      bagian.push(
        `Total ${ukur[0]}: ${formatNumber(cur)}${unit ? ' ' + unit : ''}`
      )
      if (item.shape === 'period' && prev.data) {
        const before = sumOf(prev.data, ukur[0])
        if (before > 0) {
          const delta = Math.round(((cur - before) / before) * 100)
          bagian.push(
            `${delta === 0 ? 'stabil' : delta > 0 ? 'naik' : 'turun'} ${Math.abs(delta)}% dibanding periode sebelumnya (${formatNumber(before)})`
          )
        }
      }
      if (dimensi && rows.length > 1) {
        const byDim = new Map<string, number>()
        for (const r of rows) {
          const k = String(r[dimensi] ?? '')
          byDim.set(k, (byDim.get(k) ?? 0) + (Number(r[ukur[0]]) || 0))
        }
        const sorted = [...byDim.entries()].sort((a, b) => b[1] - a[1])
        if (sorted.length > 1) {
          bagian.push(
            `terbesar: ${sorted[0][0]} (${formatNumber(sorted[0][1])})`
          )
          bagian.push(
            `terendah: ${sorted[sorted.length - 1][0]} (${formatNumber(sorted[sorted.length - 1][1])})`
          )
        }
      }
    } else {
      bagian.push(`${formatNumber(rows.length)} baris`)
    }
    return `${item.judul}: ${bagian.join(', ')}.`
  }, [
    laporan.isError,
    laporan.isLoading,
    rows,
    ukur,
    dimensi,
    unit,
    item,
    prev.data,
  ])

  const chartData = useMemo(() => {
    if (!tanggal) return rows
    const fmt = (v: unknown) => {
      const s = String(v)
      return /^\d{4}-\d{2}-\d{2}/.test(s)
        ? s.slice(8, 10) + '/' + s.slice(5, 7)
        : s
    }
    return rows.map((r) => ({ ...r, __label: fmt(r[tanggal]) }))
  }, [rows, tanggal])

  return (
    <>
      <div className='mb-4 flex flex-wrap items-end justify-between gap-3'>
        <div>
          <h1 className='text-lg font-semibold tracking-tight'>{item.judul}</h1>
          <p className='mt-1 text-xs text-muted-foreground'>
            {system.toUpperCase()} ·{' '}
            {item.shape === 'period'
              ? 'Rentang tanggal'
              : item.shape === 'asof'
                ? 'Tanggal acuan'
                : item.shape === 'none'
                  ? 'Snapshot'
                  : 'Parameter khusus'}
            {item.catatan ? ` · ${item.catatan}` : ''}
          </p>
        </div>
      </div>

      {item.params.length > 0 && (
        <form
          className='mb-4 flex flex-wrap items-end gap-2'
          onSubmit={(e) => {
            e.preventDefault()
            setParams({ ...draft })
          }}
        >
          {item.params.map((p) => (
            <label key={p.name} className='text-xs text-muted-foreground'>
              {p.name}
              <Input
                className='mt-1 h-8 w-36'
                type={
                  p.type === 'date'
                    ? 'date'
                    : p.type === 'int'
                      ? 'number'
                      : 'text'
                }
                value={draft[p.name] ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [p.name]: e.target.value }))
                }
              />
            </label>
          ))}
          <Button type='submit' size='sm' className='h-8'>
            Jalankan
          </Button>
        </form>
      )}

      <p
        className={
          laporan.isError ? 'text-sm text-negative' : 'text-sm text-foreground'
        }
        data-testid='insight-laporan'
      >
        {insight}
      </p>

      {ukur.length > 0 && rows.length > 0 && (
        <KpiStrip className='mt-4 grid grid-cols-2 gap-px lg:grid-cols-4'>
          {ukur.slice(0, 4).map((col) => (
            <Kpi
              key={col}
              label={col}
              value={formatNumber(sumOf(rows, col))}
              caption={unit || 'total periode'}
              testId={`kpi-${col}`}
            />
          ))}
        </KpiStrip>
      )}

      <div className='mt-4 grid gap-4'>
        {ukur.length > 0 && rows.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className='text-sm font-medium'>
                {tanggal
                  ? `Tren ${ukur[0]}`
                  : `Peringkat ${ukur[0]} per ${dimensi}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='h-72 w-full' data-testid='chart-generik'>
                <ResponsiveContainer width='100%' height='100%'>
                  {tanggal ? (
                    <LineChart
                      data={chartData}
                      margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke='var(--border)' />
                      <XAxis
                        dataKey='__label'
                        axisLine={false}
                        tickLine={false}
                        tick={tick}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={tick}
                        width={60}
                      />
                      <Tooltip {...tooltip} />
                      {ukur.map((col, i) => (
                        <Line
                          key={col}
                          type='monotone'
                          dataKey={col}
                          stroke={
                            i === 0 ? 'var(--chart-1)' : 'var(--chart-neutral)'
                          }
                          dot={false}
                          strokeWidth={2}
                        />
                      ))}
                    </LineChart>
                  ) : (
                    <BarChart
                      data={rows.slice(0, 15)}
                      layout='vertical'
                      margin={{ top: 0, right: 48, bottom: 0, left: 0 }}
                    >
                      <XAxis type='number' hide />
                      <YAxis
                        type='category'
                        dataKey={dimensi}
                        width={120}
                        axisLine={false}
                        tickLine={false}
                        tick={tick}
                      />
                      <Tooltip {...tooltip} />
                      <Bar
                        dataKey={ukur[0]}
                        barSize={10}
                        radius={5}
                        fill='var(--chart-neutral)'
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {rows.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className='text-sm font-medium'>
                Tabel Data ({rows.length} baris)
              </CardTitle>
            </CardHeader>
            <CardContent className='overflow-x-auto'>
              <table className='w-full text-xs'>
                <thead>
                  <tr className='border-b text-left text-muted-foreground'>
                    {Object.keys(rows[0]).map((c) => (
                      <th key={c} className='px-2 py-1.5 font-medium'>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 100).map((r, i) => (
                    <tr key={i} className='border-b last:border-0'>
                      {Object.keys(rows[0]).map((c) => (
                        <td key={c} className='px-2 py-1.5 tabular-nums'>
                          {typeof r[c] === 'number'
                            ? formatNumber(r[c])
                            : r[c] == null
                              ? '—'
                              : String(r[c])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 100 && (
                <p className='mt-2 text-xs text-muted-foreground'>
                  Menampilkan 100 baris pertama dari {rows.length}.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
