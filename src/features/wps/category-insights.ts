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

/** Mesin dengan realisasi terendah (Output ÷ Target, tertimbang per mesin). */
export function lowestRealisasi(
  rows: ReportRow[],
  machineKey: string
): { name: string; pct: number } | undefined {
  const machines = new Map<string, ReportRow[]>()
  for (const row of rows) {
    const name = String(row[machineKey] ?? '')
    if (!name) continue
    machines.set(name, [...(machines.get(name) ?? []), row])
  }
  let best: { name: string; pct: number } | undefined
  for (const [name, machineRows] of machines) {
    const pct = weightedPct(machineRows, 'Output', 'Target')
    if (!best || pct < best.pct) best = { name, pct }
  }
  return best
}

/** GRP dengan rendemen bulanan di atas 100% (Σout ÷ Σin × 100).
 *  Di laporan harian Output bisa > Input karena output memakai buffer WIP
 *  hari sebelumnya — bukan error data. */
export function rendemenOver100(
  rows: ReportRow[],
  groupKey: string
): { name: string; pct: number }[] {
  const groups = new Map<string, ReportRow[]>()
  for (const row of rows) {
    const name = String(row[groupKey] ?? '')
    if (!name) continue
    groups.set(name, [...(groups.get(name) ?? []), row])
  }
  const over: { name: string; pct: number }[] = []
  for (const [name, groupRows] of groups) {
    const input = groupRows.reduce((total, r) => total + num(r, 'Input'), 0)
    const output = groupRows.reduce((total, r) => total + num(r, 'Output'), 0)
    const pct = input > 0 ? (output / input) * 100 : 0
    if (pct > 100) over.push({ name, pct: Math.round(pct) })
  }
  return over.sort((a, b) => b.pct - a.pct)
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

/** Stok akhir pada baris Tanggal terakhir. KBKG (kayu bulat, satuan kg)
 *  dipisah — satuannya kg, kategori lainnya m³. */
export function stokAkhirTerakhir(
  rows: ReportRow[],
  keys: readonly string[]
): { nonKg: number; kbKg: number } | undefined {
  const last = latestRow(rows)
  if (!last) return undefined
  return {
    nonKg: keys.reduce((total, k) => total + num(last, k), 0),
    kbKg: num(last, 'KBKG'),
  }
}
