import { describe, expect, it } from 'vitest'
import {
  MUTASI_KEYS,
  rendemenOver100,
  stokAkhirTerakhir,
} from './category-insights'

describe('rendemenOver100', () => {
  it('menilai dari agregat per GRP, bukan per baris harian', () => {
    const rows = [
      { Tanggal: '2026-10-01', GRP: 'S4S', Input: 10, Output: 12 },
      { Tanggal: '2026-10-02', GRP: 'S4S', Input: 5, Output: 15 },
      { Tanggal: '2026-10-01', GRP: 'MOULDING', Input: 1, Output: 9 },
    ]
    // S4S: 27/15 = 180%; MOULDING: 9/1 = 900%
    expect(rendemenOver100(rows, 'GRP')).toEqual([
      { name: 'MOULDING', pct: 900 },
      { name: 'S4S', pct: 180 },
    ])
  })

  it('mengabaikan agregat wajar (≤100%), input nol, dan nama kosong', () => {
    const rows = [
      { Tanggal: '2026-10-01', GRP: 'S4S', Input: 10, Output: 10 },
      { Tanggal: '2026-10-02', GRP: 'S4S', Input: 0, Output: 0 },
      { Tanggal: '2026-10-03', GRP: '', Input: 1, Output: 5 },
    ]
    expect(rendemenOver100(rows, 'GRP')).toEqual([])
  })
})

describe('stokAkhirTerakhir', () => {
  it('memisah KBKG (kg) dari kategori m³ pada baris terakhir', () => {
    const rows = [
      { Tanggal: '2026-10-26', S4S: 100, KBKG: 9000 },
      { Tanggal: '2026-10-27', S4S: 90, KBKG: 7000 },
    ]
    expect(stokAkhirTerakhir(rows, MUTASI_KEYS)).toEqual({
      nonKg: 90,
      kbKg: 7000,
    })
  })
})
