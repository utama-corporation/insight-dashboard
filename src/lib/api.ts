import axios from 'axios'

const client = axios.create({
  // Build produksi & dev (via proxy Vite) memakai path relatif.
  // Override dengan VITE_API_BASE_URL bila API di host lain.
  baseURL: import.meta.env.VITE_API_BASE_URL || undefined,
})

export type ReportRow = Record<string, unknown>

// Satu-satunya titik yang menunjuk ke /server — seam test client.
export async function fetchReport(
  system: string,
  type: string,
  params: Record<string, string>
): Promise<ReportRow[]> {
  // Param berisi kosong tidak dikirim — SP memakai nilai default-nya.
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  )
  const res = await client.post(`/api/${system}/reports/${type}`, {
    params: clean,
  })
  return res.data.rows
}

export interface CatalogItem {
  type: string
  judul: string
  shape: 'period' | 'asof' | 'none' | 'custom'
  params: { name: string; type: 'date' | 'int' | 'string' }[]
  granted?: boolean
  catatan?: string
}

export interface CatalogGroup {
  grup: string
  items: CatalogItem[]
}

export async function fetchCatalog(system: string): Promise<CatalogGroup[]> {
  const res = await client.get(`/api/${system}/catalog`)
  return res.data.groups
}
