import { describe, expect, it } from 'vitest'
import {
  buildSampleParams,
  classifyFailure,
  describeColumns,
  type ColumnInfo,
} from './validate-helpers.js'

describe('buildSampleParams', () => {
  it('memberi rentang 30 hari untuk param awal-periode', () => {
    const params = buildSampleParams(
      [
        { name: 'tglAwal', type: 'date' },
        { name: 'tglAkhir', type: 'date' },
      ],
      new Date('2026-10-27T00:00:00Z'),
    )
    expect(params.tglAwal).toBe('2026-09-27')
    expect(params.tglAkhir).toBe('2026-10-27')
  })

  it('memberi hari ini untuk param tanggal tunggal', () => {
    const params = buildSampleParams(
      [{ name: 'perTgl', type: 'date' }],
      new Date('2026-10-27T00:00:00Z'),
    )
    expect(params.perTgl).toBe('2026-10-27')
  })
})

describe('classifyFailure', () => {
  it('menandai pelanggaran izin tulis sebagai SP tidak aman', () => {
    const err = new Error(
      "The INSERT permission was denied on the object 'log_table'",
    )
    expect(classifyFailure(err)).toBe('MENULIS_DATA')
  })

  it('menandai error lain sebagai belum tervalidasi', () => {
    expect(classifyFailure(new Error('timeout'))).toBe('BELUM_TERVALIDASI')
  })
})

describe('describeColumns', () => {
  it('mengubah IColumnMeta menjadi info kolom stabil', () => {
    const meta = [
      { name: 'Tanggal', type: 'date' },
      { name: 'Output', type: 'float' },
    ] as unknown as ColumnInfo[]
    expect(describeColumns(meta)).toEqual([
      { name: 'Tanggal', type: 'date' },
      { name: 'Output', type: 'float' },
    ])
  })
})
