import type { ReportRow } from '@/lib/api'
import { deltaPct, num, weightedPct } from '@/lib/report-metrics'

/** Baris dengan kolom Tanggal terakhir (snapshot terbaru). */
function latestRow(rows: ReportRow[]): ReportRow | undefined {
  return [...rows].sort((a, b) =>
    String(a.Tanggal).localeCompare(String(b.Tanggal))
  )[rows.length - 1]
}

/** Mesin dengan perubahan output terbesar (|Δ%|) antara dua periode. */
export function topMover(
  current: ReportRow[],
  previous: ReportRow[],
  key: string
): { name: string; delta: number } | undefined {
  const totals = (rows: ReportRow[]) => {
    const map = new Map<string, number>()
    for (const row of rows) {
      const name = String(row[key] ?? '')
      if (name) map.set(name, (map.get(name) ?? 0) + num(row, 'Output'))
    }
    return map
  }
  const cur = totals(current)
  const prev = totals(previous)
  let best: { name: string; delta: number } | undefined
  for (const [name, curValue] of cur) {
    const delta = deltaPct(curValue, prev.get(name) ?? 0)
    if (!best || Math.abs(delta) > Math.abs(best.delta)) {
      best = { name, delta }
    }
  }
  return best
}

/** Kategori dengan nilai terbesar pada snapshot mutasi terakhir. */
export function largestCategory(
  rows: ReportRow[],
  keys: string[]
): { name: string; value: number } | undefined {
  const last = latestRow(rows)
  if (!last) return undefined
  let best: { name: string; value: number } | undefined
  for (const key of keys) {
    const value = num(last, key)
    if (!best || value > best.value) best = { name: key, value }
  }
  return best
}

/** GRP dengan rendemen tertimbang terendah. */
export function lowestRendemen(
  rows: ReportRow[],
  groupKey: string
): { name: string; pct: number } | undefined {
  const groups = new Map<string, ReportRow[]>()
  for (const row of rows) {
    const name = String(row[groupKey] ?? '')
    if (!name) continue
    groups.set(name, [...(groups.get(name) ?? []), row])
  }
  let best: { name: string; pct: number } | undefined
  for (const [name, groupRows] of groups) {
    const pct = weightedPct(groupRows, 'Output', 'Input')
    if (!best || pct < best.pct) best = { name, pct }
  }
  return best
}

export const MUTASI_KEYS = [
  'KB',
  'ST',
  'S4S',
  'BJadi',
  'LMT',
  'MLD',
  'FJ',
  'SAND',
  'CCAkhir',
] as const

export const MUTASI_LABELS: Record<string, string> = {
  KB: 'Kayu Bulat',
  ST: 'Sawn Timber',
  S4S: 'S4S',
  BJadi: 'Barang Jadi',
  LMT: 'Laminating',
  MLD: 'Moulding',
  FJ: 'Finger Joint',
  SAND: 'Sanding',
  CCAkhir: 'Cross Cut Akhir',
}
