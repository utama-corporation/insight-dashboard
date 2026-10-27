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
 * denied" — itu justru deteksi otomatis bahwa SP tidak aman untuk dashboard.
 */
export function classifyFailure(error: unknown): 'MENULIS_DATA' | 'BELUM_TERVALIDASI' {
  const message = error instanceof Error ? error.message : String(error)
  if (/permission was denied|EXECUTE permission/i.test(message)) {
    return 'MENULIS_DATA'
  }
  return 'BELUM_TERVALIDASI'
}

export function describeColumns(meta: unknown): ColumnInfo[] {
  if (!Array.isArray(meta)) return []
  return meta
    .filter((c) => c !== null && typeof c === 'object' && 'name' in c)
    .map((c) => {
      const col = c as { name: unknown; type: unknown }
      return { name: String(col.name), type: String(col.type ?? '?') }
    })
}
