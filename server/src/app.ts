import express, { type Express, type Request, type Response } from 'express'

export type ParamType = 'date' | 'int' | 'string'

export interface ParamDef {
  name: string
  type: ParamType
  /** Nama parameter di sisi SP bila berbeda dari nama field. */
  sp?: string
}

export interface ReportDef {
  type: string
  procedure: string
  params: ParamDef[]
}

export interface SystemDef {
  database: string
  reports: ReportDef[]
}

export type Whitelist = Record<string, SystemDef>

export type RunReport = (
  system: string,
  def: ReportDef,
  params: Record<string, string>,
  database: string,
) => Promise<unknown[]>

/** Metadata katalog (dari reports.catalog.yaml) untuk UI. */
export interface CatalogItem {
  type: string
  judul: string
  procedure: string | null
  shape: 'period' | 'asof' | 'none' | 'custom'
  params: ParamDef[]
  granted?: boolean
  catatan?: string
  kolom?: string[]
  contohBaris?: number
}

export interface CatalogData {
  systems: Record<string, { groups: { grup: string; items: CatalogItem[] }[] }>
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function validateParams(
  def: ReportDef,
  body: unknown,
): { ok: true; params: Record<string, string> } | { ok: false; fields: string[] } {
  const bodyParams =
    body !== null && typeof body === 'object' && 'params' in body
      ? (body as { params: unknown }).params
      : undefined
  const provided =
    bodyParams !== null && typeof bodyParams === 'object'
      ? (bodyParams as Record<string, unknown>)
      : {}

  const allowed = new Set(def.params.map((p) => p.name))
  const unknown = Object.keys(provided).filter((k) => !allowed.has(k))
  if (unknown.length > 0) return { ok: false, fields: unknown }

  const missing: string[] = []
  for (const p of def.params) {
    const value = provided[p.name]
    if (p.type === 'date') {
      if (typeof value !== 'string' || !DATE_RE.test(value) || Number.isNaN(Date.parse(value))) {
        missing.push(p.name)
      }
    } else if (p.type === 'int') {
      // Kosong = tidak dikirim — SP memakai nilai default (mis. UsingMode).
      if (value === undefined || value === '') continue
      const n = typeof value === 'number' ? value : Number(value)
      if (!Number.isFinite(n)) missing.push(p.name)
    } else {
      if (typeof value !== 'string' || value.trim().length === 0 || value.length > 100) {
        missing.push(p.name)
      }
    }
  }
  if (missing.length > 0) return { ok: false, fields: missing }

  const params: Record<string, string> = {}
  for (const p of def.params) {
    const v = provided[p.name]
    if (v === undefined || v === '') continue
    params[p.name] = p.type === 'int' ? String(Number(v)) : (v as string)
  }
  return { ok: true, params }
}

export function createApp({
  whitelist,
  runReport,
  catalogData,
  allowedOrigin = 'http://localhost:5173',
}: {
  whitelist: Whitelist
  runReport: RunReport
  /** Metadata katalog laporan untuk endpoint /api/:system/catalog. */
  catalogData?: CatalogData
  allowedOrigin?: string
}): Express {
  const app = express()
  const allowed = allowedOrigin.replace(/\/+$/, '')
  app.use((req, res, next) => {
    res.vary('Origin')
    const originAllowed = req.headers.origin === allowed
    if (originAllowed) {
      res.setHeader('Access-Control-Allow-Origin', allowed)
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    }
    if (req.method === 'OPTIONS' && originAllowed) {
      res.sendStatus(204)
      return
    }
    next()
  })
  app.use(express.json())
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true })
  })
  app.post('/api/:system/reports/:type', async (req, res) => {
    const { system, type } = req.params
    const sys = whitelist[system]
    if (!sys) return res.status(400).json({ error: 'INVALID_SYSTEM' })
    const def = sys.reports.find((r) => r.type === type)
    if (!def) return res.status(400).json({ error: 'UNKNOWN_REPORT_TYPE' })

    const result = validateParams(def, req.body)
    if (!result.ok) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: result.fields })
    }

    try {
      const rows = await runReport(system, def, result.params, sys.database)
      return res.json({ system, type, rows })
    } catch (err) {
      console.error(`report ${system}/${type} failed`, err)
      return res.status(500).json({ error: 'REPORT_FAILED' })
    }
  })

  app.get('/api/:system/catalog', (req, res) => {
    const { system } = req.params
    const catalog = catalogData?.systems?.[system]
    if (!catalog || !catalog.groups?.length) {
      return res.status(404).json({ error: 'CATALOG_NOT_FOUND' })
    }
    // ringkas: buang detail internal (kolom/contoh) dari payload.
    const groups = catalog.groups.map((g) => ({
      grup: g.grup,
      items: g.items.map(({ kolom: _k, contohBaris: _c, ...item }) => item),
    }))
    return res.json({ system, groups })
  })
  return app
}
