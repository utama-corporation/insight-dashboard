import { readFileSync } from 'node:fs'
import sql, { type ConnectionPool } from 'mssql'
import { parse } from 'yaml'
import { createApp, type RunReport, type Whitelist } from './app.js'

const whitelist = parse(
  readFileSync(new URL('../reports.yaml', import.meta.url), 'utf8'),
) as Whitelist

const pools = new Map<string, ConnectionPool>()

function connectionString(system: string): string {
  const envName = `${system.toUpperCase()}_CONNECTION_STRING`
  const value = process.env[envName]
  if (!value) {
    throw new Error(`Missing ${envName} in environment`)
  }
  return value
}

async function getPool(system: string): Promise<ConnectionPool> {
  const existing = pools.get(system)
  if (existing) return existing
  const pool = await new sql.ConnectionPool(connectionString(system)).connect()
  pools.set(system, pool)
  return pool
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
