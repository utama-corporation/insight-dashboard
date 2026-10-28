import { readFileSync } from 'node:fs'
import path from 'node:path'
import sql, { type ConnectionPool } from 'mssql'
import { parse } from 'yaml'
import { createApp, type RunReport, type Whitelist } from './app.js'

interface DbCredentials {
  server: string
  user: string
  password: string
}

function loadWhitelist(): Whitelist {
  const raw = parse(
    readFileSync(path.resolve(process.cwd(), 'reports.yaml'), 'utf8'),
  ) as unknown
  if (raw === null || typeof raw !== 'object' || !('systems' in raw)) {
    throw new Error('reports.yaml: missing "systems"')
  }
  const whitelist = (raw as { systems: unknown }).systems as Whitelist
  for (const [system, def] of Object.entries(whitelist)) {
    if (typeof def?.database !== 'string' || !Array.isArray(def.reports)) {
      throw new Error(`reports.yaml: system "${system}" tidak valid`)
    }
    for (const report of def.reports) {
      if (
        typeof report.type !== 'string' ||
        typeof report.procedure !== 'string' ||
        !Array.isArray(report.params)
      ) {
        throw new Error(
          `reports.yaml: laporan "${system}/${report.type ?? '?'}" tidak valid`,
        )
      }
    }
  }
  return whitelist
}

function credentials(system: string): DbCredentials {
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

const pools = new Map<string, Promise<ConnectionPool>>()

const cacheTtl = Number(process.env.REPORT_CACHE_MS ?? 300_000) // 5 menit; set env untuk menyingkat
function getPool(system: string, database: string): Promise<ConnectionPool> {
  const key = `${system}:${database}`
  const existing = pools.get(key)
  if (existing) return existing
  const creds = credentials(system)
  const created = new sql.ConnectionPool({
    server: creds.server,
    user: creds.user,
    password: creds.password,
    database,
    pool: { max: 20, min: 2, idleTimeoutMillis: 30000 },
    options: { encrypt: false, trustServerCertificate: true },
  })
    .connect()
    .catch((err: unknown) => {
      pools.delete(key)
      throw err
    })
  pools.set(key, created)
  return created
}

const reportCache = new Map<string, { rows: unknown[]; expires: number }>()

const runReport: RunReport = async (system, def, params, database) => {
  const cacheKey = JSON.stringify({ system, type: def.type, params, database })
  const cached = reportCache.get(cacheKey)
  if (cached && cached.expires > Date.now()) return cached.rows
  const pool = await getPool(system, database)
  const request = pool.request()
  for (const p of def.params) {
    if (p.type === 'date') {
      request.input(p.name, sql.Date, new Date(`${params[p.name]}T00:00:00Z`))
    }
  }
  const result = await request.execute(def.procedure)
  const rows = result.recordset ?? []
  reportCache.set(cacheKey, { rows, expires: Date.now() + cacheTtl })
  return rows
}

// Hangatkan pool tiap sistem saat boot — permintaan pertama tidak perlu
// membayar handshake koneksi (init konektor + login). Kredensial hilang
// atau DB mati tidak boleh menggagalkan boot; hanya tanda peringatan.
const whitelist = loadWhitelist()
for (const [system, def] of Object.entries(whitelist)) {
  try {
    getPool(system, def.database)
      .then(() => console.log(`pool ${system} (${def.database}) ready`))
      .catch((err: unknown) =>
        console.warn(`pool ${system} belum siap: ${String(err)}`)
      )
  } catch (err) {
    console.warn(`pool ${system} belum siap: ${String(err)}`)
  }
}

const port = Number(process.env.PORT ?? 3001)
createApp({
  whitelist,
  runReport,
  allowedOrigin: process.env.CORS_ORIGIN || undefined,
}).listen(port, () => {
  console.log(`insight server listening on :${port}`)
})
