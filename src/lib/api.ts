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
  const res = await client.post(`/api/${system}/reports/${type}`, { params })
  return res.data.rows
}
