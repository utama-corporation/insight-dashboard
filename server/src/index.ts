import { readFileSync } from 'node:fs'
import sql, { type ConnectionPool } from 'mssql'
import { parse } from 'yaml'
import { createApp, type RunReport, type Whitelist } from './app.js'

function loadWhitelist(): Whitelist {
  const raw = parse(
    readFileSync(new URL('../reports.yaml', import.meta.url), 'utf8'),
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

const whitelist = loadWhitelist()

const pools = new Map<string, Promise<ConnectionPool>>()

function connectionString(system: string): string {
  const envName = `${system.toUpperCase()}_CONNECTION_STRING`
  const value = process.env[envName]
  if (!value) {
    throw new Error(`Missing ${envName} in environment`)
  }
  return value
}

function getPool(system: string): Promise<ConnectionPool> {
  const existing = pools.get(system)
  if (existing) return existing
  const created = new sql.ConnectionPool(connectionString(system))
    .connect()
    .catch((err: unknown) => {
      pools.delete(system)
      throw err
    })
  pools.set(system, created)
  return created
}

const runReport: RunReport = async (system, def, params) => {
  const pool = await getPool(system)
  const request = pool.request()
  for (const p of def.params) {
    if (p.type === 'date') {
      request.input(p.name, sql.Date, new Date(`${params[p.name]}T00:00:00Z`))
    }
  }
  const result = await request.execute(def.procedure)
  return result.recordset ?? []
}

const port = Number(process.env.PORT ?? 3001)
createApp({ whitelist, runReport }).listen(port, () => {
  console.log(`insight server listening on :${port}`)
})
