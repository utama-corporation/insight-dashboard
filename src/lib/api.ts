import axios from 'axios'

const client = axios.create({
  // Build produksi tanpa env memakai path relatif (di-proxy/deploy bersama API).
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV ? 'http://localhost:3001' : undefined),
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
