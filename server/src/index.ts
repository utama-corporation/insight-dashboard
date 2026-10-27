import { readFileSync, writeFileSync } from 'node:fs'
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
    readFileSync(new URL('../reports.yaml', import.meta.url), 'utf8'),
  ) as unknown
  if (raw === null || typeof raw !== 'object' || !('systems' in raw)) {
    throw new Error('reports.yaml: missing "systems"')
  }
  return (raw as { systems: unknown }).systems as Whitelist
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

const runReport: RunReport = async (system, def, params, database) => {
  const pool = await getPool(system, database)
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
createApp({ whitelist: loadWhitelist(), runReport }).listen(port, () => {
  console.log(`insight server listening on :${port}`)
})
