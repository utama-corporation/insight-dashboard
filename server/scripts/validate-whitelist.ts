/**
 * Validasi whitelist terhadap database Production via akun read-only
 * (#YOUR_READ_ONLY_USER). Untuk setiap laporan: jalankan SP dengan contoh params,
 * catat bentuk kolom + jumlah baris; SP yang mencoba menulis data
 * ditandai MENULIS_DATA (gagal permission) dan harus dikeluarkan dari
 * whitelist. Jalankan di luar jam sibuk.
 *
 *   node --env-file-if-exists=.env scripts/validate-whitelist.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import sql from 'mssql'
import { parse } from 'yaml'
import type { RunReport, Whitelist } from '../src/app.js'
import {
  buildSampleParams,
  classifyFailure,
  describeColumns,
  type ColumnInfo,
} from './validate-helpers.js'

interface ResultRow {
  system: string
  type: string
  procedure: string
  status: 'OK' | 'MENULIS_DATA' | 'BELUM_TERVALIDASI'
  columns?: ColumnInfo[]
  rowCount?: number
  error?: string
}

function loadWhitelist(): Whitelist {
  return parse(
    readFileSync(new URL('../reports.yaml', import.meta.url), 'utf8'),
  ) as Whitelist
}

function connectionString(system: string): string {
  const envName = `${system.toUpperCase()}_CONNECTION_STRING`
  const value = process.env[envName]
  if (!value) throw new Error(`Missing ${envName} in environment`)
  return value
}

const runReport: RunReport = async (system, def, params) => {
  const pool = await new sql.ConnectionPool(connectionString(system)).connect()
  const request = pool.request()
  for (const p of def.params) {
    if (p.type === 'date') {
      request.input(p.name, sql.Date, new Date(`${params[p.name]}T00:00:00Z`))
    }
  }
  const result = await request.execute(def.procedure)
  await pool.close()
  return result.recordset ?? []
}

const whitelist = loadWhitelist()
const results: ResultRow[] = []

for (const [system, def] of Object.entries(whitelist)) {
  for (const report of def.reports) {
    const base = { system, type: report.type, procedure: report.procedure }
    try {
      const params = buildSampleParams(report.params)
      const rows = await runReport(system, report, params)
      const recordset = (rows as unknown as { columns?: unknown }) ?? []
      const columns = describeColumns(
        (recordset as { columns?: unknown }).columns,
      )
      results.push({
        ...base,
        status: 'OK',
        columns,
        rowCount: rows.length,
      })
      console.log(
        `OK   ${system}/${report.type}: ${rows.length} baris, kolom: ${columns
          .map((c) => c.name)
          .join(', ')}`,
      )
    } catch (error) {
      const status = classifyFailure(error)
      const message = error instanceof Error ? error.message : String(error)
      results.push({ ...base, status, error: message })
      console.log(`${status} ${system}/${report.type}: ${message}`)
    }
  }
}

writeFileSync(
  new URL('../whitelist-validation.json', import.meta.url),
  JSON.stringify(results, null, 2),
)
console.log(`\n${results.length} laporan divalidasi -> whitelist-validation.json`)
