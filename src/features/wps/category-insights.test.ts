import { describe, expect, it } from 'vitest'
import { rendemenAnomalies } from './category-insights'

describe('rendemenAnomalies', () => {
  it('mengelompokkan baris >100% dan mengambil puncaknya', () => {
    const rows = [
      { Tanggal: '2026-10-01', GRP: 'S4S', Input: 10, Output: 12 },
      { Tanggal: '2026-10-02', GRP: 'S4S', Input: 5, Output: 15 },
      { Tanggal: '2026-10-01', GRP: 'MOULDING', Input: 1, Output: 9 },
    ]
    expect(rendemenAnomalies(rows, 'GRP')).toEqual([
      { name: 'MOULDING', rows: 1, maxPct: 900, maxDate: '2026-10-01' },
      { name: 'S4S', rows: 2, maxPct: 300, maxDate: '2026-10-02' },
    ])
  })

  it('mengabaikan rendemen wajar, input nol, dan nama kosong', () => {
    const rows = [
      { Tanggal: '2026-10-01', GRP: 'S4S', Input: 10, Output: 10 },
      { Tanggal: '2026-10-02', GRP: 'S4S', Input: 0, Output: 5 },
      { Tanggal: '2026-10-03', GRP: '', Input: 1, Output: 5 },
    ]
    expect(rendemenAnomalies(rows, 'GRP')).toEqual([])
  })
})
