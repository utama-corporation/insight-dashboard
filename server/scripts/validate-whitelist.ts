/**
 * Validasi whitelist terhadap database Production via akun read-only
 * (#YOUR_READ_ONLY_USER). Untuk setiap laporan: jalankan SP dengan contoh params,
 * catat bentuk kolom + jumlah baris; SP yang mencoba menulis data
 * ditandai MENULIS_DATA (gagal permission DML) dan harus dikeluarkan
 * dari whitelist. Jalankan di luar jam sibuk.
 *
 *   node --env-file-if-exists=.env scripts/validate-whitelist.ts
 *
 * Catatan deteksi: jika SP dan tabelnya satu owner (dbo), ownership
 * chaining bisa membuat SP penulis lolos sebagai OK — tembuskan hasil
 * ke DBA untuk cek silang ke definisi SP bila ragu.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import sql from 'mssql'
import { parse } from 'yaml'
import type { RunReport, Whitelist } from '../src/app.ts'
import {
  buildSampleParams,
  classifyFailure,
  describeColumns,
  type ColumnInfo,
} from './validate-helpers.ts'

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
  const raw = parse(
    readFileSync(new URL('../reports.yaml', import.meta.url), 'utf8'),
  ) as unknown
  if (raw === null || typeof raw !== 'object' || !('systems' in raw)) {
    throw new Error('reports.yaml: missing "systems"')
  }
  return (raw as { systems: unknown }).systems as Whitelist
}

function credentials(system: string): {
  server: string
  user: string
  password: string
} {
  const prefix = system.toUpperCase()
  const server = process.env[`${prefix}_DB_SERVER`]
  const user = process.env[`${prefix}_DB_USER`]
  const password = process.env[`${prefix}_DB_PASSWORD`]
  if (!server || !user || !password) {
    throw new Error(
      `Missing ${prefix}_DB_SERVER / ${prefix}_DB_USER / ${prefix}_DB_PASSWORD in environment`,
    )
  }
  return { server, user, password }
}

const runReport: RunReport = async (system, def, params, database) => {
  const creds = credentials(system)
  const pool = await new sql.ConnectionPool({
    server: creds.server,
    user: creds.user,
    password: creds.password,
    database,
    options: { encrypt: false, trustServerCertificate: true },
  }).connect()
  try {
    const request = pool.request()
    for (const p of def.params) {
      if (p.type === 'date') {
        request.input(
          p.name,
          sql.Date,
          new Date(`${params[p.name]}T00:00:00Z`),
        )
      }
    }
    const result = await request.execute(def.procedure)
    return result.recordset ?? []
  } finally {
    await pool.close()
  }
}

const whitelist = loadWhitelist()
const results: ResultRow[] = []

for (const [system, def] of Object.entries(whitelist)) {
  for (const report of def.reports) {
    const base = { system, type: report.type, procedure: report.procedure }
    try {
      const params = buildSampleParams(report.params)
      const rows = await runReport(system, report, params, def.database)
      const columns = describeColumns(
        (rows as unknown as { columns?: unknown }).columns,
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
