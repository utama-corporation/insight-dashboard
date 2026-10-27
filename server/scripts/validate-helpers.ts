export interface ColumnInfo {
  name: string
  type: string
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Contoh params untuk validasi: param awal-periode (berakhiran "awal")
 * mundur 30 hari, param tanggal tunggal memakai hari ini.
 */
export function buildSampleParams(
  paramDefs: Array<{ name: string; type: string }>,
  today = new Date(),
): Record<string, string> {
  const params: Record<string, string> = {}
  for (const def of paramDefs) {
    if (def.type !== 'date') {
      throw new Error(`tipe param ${def.type} belum didukung`)
    }
    const isPeriodStart = /awal$/i.test(def.name)
    const date = new Date(today)
    if (isPeriodStart) date.setUTCDate(date.getUTCDate() - 30)
    params[def.name] = isoDate(date)
  }
  return params
}

/**
 * Dengan akun read-only, SP yang mencoba menulis akan gagal "permission
 * denied" DML (INSERT/UPDATE/DELETE) — itu deteksi otomatis bahwa SP
 * tidak aman untuk dashboard. Penolakan izin EXECUTE berarti grant
 * kurang (bukan bukti SP menulis) → masuk kategori lain.
 */
export function classifyFailure(
  error: unknown,
): 'MENULIS_DATA' | 'BELUM_TERVALIDASI' {
  const message = error instanceof Error ? error.message : String(error)
  if (
    /(INSERT|UPDATE|DELETE)\s+permission was denied/i.test(message) ||
    /The (INSERT|UPDATE|DELETE) permission/i.test(message)
  ) {
    return 'MENULIS_DATA'
  }
  return 'BELUM_TERVALIDASI'
}

export function describeColumns(meta: unknown): ColumnInfo[] {
  const entries = Array.isArray(meta) ? meta : Object.values(meta ?? {})
  return entries
    .filter(
      (c): c is { name: unknown; type?: unknown } =>
        c !== null && typeof c === 'object' && 'name' in c,
    )
    .map((c) => ({ name: String(c.name), type: sqlTypeName(c.type) }))
}

function sqlTypeName(type: unknown): string {
  if (typeof type === 'function') {
    return (type as { declaration?: string }).declaration ?? type.name ?? '?'
  }
  return typeof type === 'string' ? type : '?'
}
