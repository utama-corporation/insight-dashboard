import express, { type Express, type Request, type Response } from 'express'

export type ParamType = 'date'

export interface ParamDef {
  name: string
  type: ParamType
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
) => Promise<unknown[]>

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
    } else {
      missing.push(p.name)
    }
  }
  if (missing.length > 0) return { ok: false, fields: missing }

  const params: Record<string, string> = {}
  for (const p of def.params) params[p.name] = provided[p.name] as string
  return { ok: true, params }
}

export function createApp({
  whitelist,
  runReport,
}: {
  whitelist: Whitelist
  runReport: RunReport
}): Express {
  const app = express()
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
      const rows = await runReport(system, def, result.params)
      return res.json({ system, type, rows })
    } catch (err) {
      console.error(`report ${system}/${type} failed`, err)
      return res.status(500).json({ error: 'REPORT_FAILED' })
    }
  })
  return app
}
