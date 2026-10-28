/** Label bulan id-ID — dipakai MonthPicker & kalimat insight WPS. */
export const BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const

/** '2026-10' -> 'Oktober 2026'. */
export function labelPeriode(value: string): string {
  const [year, monthIdx] = value.split('-').map(Number) as [number, number]
  return `${BULAN[monthIdx - 1]} ${year}`
}
