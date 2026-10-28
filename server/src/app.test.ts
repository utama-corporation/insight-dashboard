import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { createApp, type RunReport, type Whitelist } from './app.js'

const whitelist: Whitelist = {
  wps: {
    database: 'WPS',
    reports: [
      {
        type: 'produksi-semua-mesin',
        procedure: 'SPWps_LapProduksiSemuaMesin',
        params: [
          { name: 'tglAwal', type: 'date' },
          { name: 'tglAkhir', type: 'date' },
        ],
      },
    ],
  },
}

let calls: Array<{
  system: string
  procedure: string
  params: Record<string, string>
}> = []

// Test double di seam database: seluruh perilaku diamati dari luar HTTP.
const runReport: RunReport = async (system, def, params) => {
  calls.push({ system, procedure: def.procedure, params })
  return [{ Tanggal: '2026-10-01', Output: 12.5 }]
}

let server: Server
let base: string

beforeAll(async () => {
  const app = createApp({ whitelist, runReport })
  server = app.listen(0)
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => server.close())

const post = (path: string, body: unknown) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('CORS', () => {
  const origin = 'http://localhost:5173'

  it('menjawab preflight dari origin yang diizinkan', async () => {
    const res = await fetch(`${base}/api/wps/reports/produksi-semua-mesin`, {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    })
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-origin')).toBe(origin)
    expect(res.headers.get('access-control-allow-methods')).toContain('POST')
    expect(res.headers.get('access-control-allow-headers')).toContain(
      'Content-Type',
    )
    expect(res.headers.get('vary')).toContain('Origin')
  })

  it('tidak menelan OPTIONS tanpa Origin', async () => {
    const res = await fetch(`${base}/api/wps/reports/produksi-semua-mesin`, {
      method: 'OPTIONS',
    })
    expect(res.status).not.toBe(204)
  })

  it('mengirim header CORS pada request sebenarnya', async () => {
    const res = await fetch(`${base}/api/wps/reports/produksi-semua-mesin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify({
        params: { tglAwal: '2026-10-01', tglAkhir: '2026-10-27' },
      }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBe(origin)
  })

  it('tidak mengizinkan origin lain', async () => {
    const res = await fetch(`${base}/api/wps/reports/produksi-semua-mesin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://evil.test' },
      body: JSON.stringify({
        params: { tglAwal: '2026-10-01', tglAkhir: '2026-10-27' },
      }),
    })
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })
})

describe('POST /api/:system/reports/:type', () => {
  it('menolak sistem yang tidak ada di whitelist', async () => {
    const res = await post('/api/unknown/reports/produksi-semua-mesin', {})
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'INVALID_SYSTEM' })
  })

  it('menolak report type di luar whitelist', async () => {
    const res = await post('/api/wps/reports/hapus-semua-data', {})
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'UNKNOWN_REPORT_TYPE' })
  })

  it('menolak params yang tidak lengkap', async () => {
    const res = await post('/api/wps/reports/produksi-semua-mesin', {
      params: { tglAwal: '2026-10-01' },
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'VALIDATION_ERROR' })
  })

  it('menolak params yang tidak dikenal', async () => {
    const res = await post('/api/wps/reports/produksi-semua-mesin', {
      params: { tglAwal: '2026-10-01', tglAkhir: '2026-10-27', hack: true },
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'VALIDATION_ERROR' })
  })

  it('menolak params berbentuk bukan tanggal', async () => {
    const res = await post('/api/wps/reports/produksi-semua-mesin', {
      params: { tglAwal: 'october', tglAkhir: '2026-10-27' },
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'VALIDATION_ERROR' })
  })

  it('menjalankan SP whitelist dan mengembalikan baris JSON', async () => {
    calls = []
    const res = await post('/api/wps/reports/produksi-semua-mesin', {
      params: { tglAwal: '2026-10-01', tglAkhir: '2026-10-27' },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      system: 'wps',
      type: 'produksi-semua-mesin',
      rows: [{ Tanggal: '2026-10-01', Output: 12.5 }],
    })
    expect(calls).toEqual([
      {
        system: 'wps',
        procedure: 'SPWps_LapProduksiSemuaMesin',
        params: { tglAwal: '2026-10-01', tglAkhir: '2026-10-27' },
      },
    ])
  })
})
