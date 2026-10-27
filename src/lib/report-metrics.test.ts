import { describe, expect, it } from 'vitest'
import { periodBounds } from './report-metrics'

describe('periodBounds', () => {
  it('memotong bulan berjalan sampai hari ini dan membandingkan jendela sama panjang', () => {
    const { cur, prev } = periodBounds(
      '2026-10',
      new Date('2026-10-27T08:00:00Z')
    )
    expect(cur).toEqual({ awal: '2026-10-01', akhir: '2026-10-27' })
    expect(prev).toEqual({ awal: '2026-09-01', akhir: '2026-09-27' })
  })

  it('tidak menghasilkan tanggal mustahil saat bulan sebelumnya lebih pendek', () => {
    const { prev } = periodBounds('2026-03', new Date('2026-03-31T08:00:00Z'))
    expect(prev).toEqual({ awal: '2026-02-01', akhir: '2026-02-28' })
  })

  it('menangani Januari dengan Desember tahun sebelumnya', () => {
    const { prev } = periodBounds('2026-01', new Date('2026-01-31T08:00:00Z'))
    expect(prev).toEqual({ awal: '2025-12-01', akhir: '2025-12-31' })
  })
})
