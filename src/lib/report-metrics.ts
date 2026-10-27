import type { ReportRow } from '@/lib/api'

export type Period = { awal: string; akhir: string }

export function sumBy(rows: ReportRow[], key: string): number {
  return rows.reduce((total, row) => total + num(row, key), 0)
}

export function num(row: ReportRow, key: string): number {
  const value = row[key]
  return typeof value === 'number' ? value : Number(value) || 0
}

export function deltaPct(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100
  return Math.round(((current - previous) / previous) * 100)
}

/** Persentase tertimbang: sum(numKey) / sum(denomKey) × 100. */
export function weightedPct(
  rows: ReportRow[],
  numKey: string,
  denomKey: string
): number {
  const denom = sumBy(rows, denomKey)
  if (denom === 0) return 0
  return Math.round((sumBy(rows, numKey) / denom) * 100)
}

export function formatDelta(pct: number): string {
  return pct > 0 ? `+${pct}%` : `${pct}%`
}

const idFormat = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 })

export function formatNumber(value: number): string {
  return idFormat.format(value)
}

/** Baris dengan kolom Tanggal terakhir (snapshot terbaru). */
function latestRow(rows: ReportRow[]): ReportRow | undefined {
  return [...rows].sort((a, b) =>
    String(a.Tanggal).localeCompare(String(b.Tanggal))
  )[rows.length - 1]
}

export function latestTotal(rows: ReportRow[], key: string): number {
  const last = latestRow(rows)
  return last ? num(last, key) : 0
}

/** Batas periode dari 'YYYY-MM': bulan terpilih (dipotong hari ini bila berjalan) + jendela sama panjang di bulan sebelumnya. */
export function periodBounds(
  month: string,
  today = new Date()
): { cur: Period; prev: Period } {
  const [year, monthIdx] = month.split('-').map(Number) as [number, number]
  const monthEnd = new Date(Date.UTC(year, monthIdx, 0)).getUTCDate()
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() + 1 === monthIdx
  const curEndDay = isCurrentMonth ? today.getDate() : monthEnd
  const cur: Period = {
    awal: `${month}-01`,
    akhir: `${month}-${String(curEndDay).padStart(2, '0')}`,
  }
  const prevYear = monthIdx === 1 ? year - 1 : year
  const prevMonthIdx = monthIdx === 1 ? 12 : monthIdx - 1
  const prev: Period = {
    awal: `${prevYear}-${String(prevMonthIdx).padStart(2, '0')}-01`,
    akhir: `${prevYear}-${String(prevMonthIdx).padStart(2, '0')}-${String(
      curEndDay
    ).padStart(2, '0')}`,
  }
  return { cur, prev }
}
