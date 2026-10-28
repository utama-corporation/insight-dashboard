import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// Tailwind dimuat — tanpa ini popover bulan melebar keluar viewport iframe
// (414px) dan tombol bulan tidak bisa diklik (lihat ruling di SDD ledger).
import '@/styles/index.css'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { fetchReport } from '@/lib/api'
import { DirectionProvider } from '@/context/direction-provider'
import { LayoutProvider } from '@/context/layout-provider'
import { ThemeProvider } from '@/context/theme-provider'
import { SidebarProvider } from '@/components/ui/sidebar'
import { WpsPage } from './index'

vi.mock('@/lib/api', () => ({
  fetchReport: vi.fn(),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    // Halaman memakai Link di dalam layout; tanpa RouterProvider di test,
    // Link dirender sebagai <a> biasa — perilaku yang diuji tetap KPI/Δ%.
    Link: ((props: {
      to: string
      children?: React.ReactNode
      className?: string
      onClick?: () => void
    }) => (
      <a href={props.to} className={props.className} onClick={props.onClick}>
        {props.children}
      </a>
    )) as unknown as typeof actual.Link,
    useNavigate:
      () =>
      (..._args: unknown[]) => {},
  }
})

const mockFetchReport = vi.mocked(fetchReport)

// Fixture mengikuti bentuk kolom SP yang tervalidasi:
// SPWps_LapProduksiSemuaMesin, SP_LapRekapMutasiV2, SP_LapRekapRendemenSemuaProses
const produksiCur = [
  {
    Tanggal: '2026-10-02',
    NamaMesin: 'A',
    Target: 100,
    Input: 100,
    Output: 60,
    Rend: 60,
  },
  {
    Tanggal: '2026-10-03',
    NamaMesin: 'B',
    Target: 100,
    Input: 100,
    Output: 40,
    Rend: 40,
  },
]
const produksiPrev = [
  {
    Tanggal: '2026-09-02',
    NamaMesin: 'A',
    Target: 100,
    Input: 100,
    Output: 50,
    Rend: 50,
  },
]
const mutasiCur = [
  { Tanggal: '2026-10-26', TotalAkhir: 120 },
  { Tanggal: '2026-10-27', TotalAkhir: 90 },
]
const mutasiPrev = [{ Tanggal: '2026-09-27', TotalAkhir: 100 }]
const rendemenCur = [
  { Tanggal: '2026-10-27', Input: 100, Output: 60, GRP: 'S4S' },
]
const rendemenPrev = [
  { Tanggal: '2026-09-27', Input: 100, Output: 50, GRP: 'S4S' },
]

async function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return await render(
    <QueryClientProvider client={queryClient}>
      <DirectionProvider>
        <ThemeProvider>
          <LayoutProvider>
            <SidebarProvider>
              <WpsPage initialMonth='2026-10' />
            </SidebarProvider>
          </LayoutProvider>
        </ThemeProvider>
      </DirectionProvider>
    </QueryClientProvider>
  )
}

describe('WpsPage — Lapisan 1 Ringkasan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchReport.mockImplementation(async (_system, type, params) => {
      const isCur = params.tglAwal?.startsWith('2026-10')
      switch (type) {
        case 'produksi-semua-mesin':
          return isCur ? produksiCur : produksiPrev
        case 'rekap-mutasi':
          return isCur ? mutasiCur : mutasiPrev
        case 'rendemen-semua-proses':
          return isCur ? rendemenCur : rendemenPrev
        default:
          throw new Error(`unexpected report type ${type}`)
      }
    })
  })

  it('menampilkan KPI dari data periode terpilih', async () => {
    const screen = await renderPage()

    // Total Produksi = 60 + 40 = 100
    await expect.element(screen.getByText('Total Produksi')).toBeInTheDocument()
    await expect
      .element(screen.getByTestId('kpi-total-produksi'))
      .toHaveTextContent('100')
    // Realisasi = 100/200 = 50%
    await expect
      .element(screen.getByTestId('kpi-realisasi'))
      .toHaveTextContent('50%')
    // Rendemen tertimbang = 60/100 = 60%
    await expect
      .element(screen.getByTestId('kpi-rendemen'))
      .toHaveTextContent('60%')
    // Mutasi akhir = 90
    await expect
      .element(screen.getByTestId('kpi-mutasi'))
      .toHaveTextContent('90')
    // Data wajar -> tidak ada banner anomali
    expect(document.querySelector('[data-testid="insight-anomali"]')).toBeNull()
  })

  it('menampilkan placeholder, bukan 0, saat data belum termuat', async () => {
    mockFetchReport.mockImplementation(() => new Promise(() => {}))
    const screen = await renderPage()

    await expect
      .element(screen.getByTestId('kpi-total-produksi'))
      .toHaveTextContent('—')
    await expect
      .element(screen.getByTestId('insight-produksi'))
      .toHaveTextContent('Memuat data produksi…')
  })

  it('menampilkan pesan gagal saat laporan gagal dimuat', async () => {
    mockFetchReport.mockRejectedValue(new Error('server down'))
    const screen = await renderPage()

    await expect
      .element(screen.getByTestId('insight-produksi'))
      .toHaveTextContent('Gagal memuat data')
    await expect
      .element(screen.getByTestId('kpi-total-produksi'))
      .toHaveTextContent('—')
  })

  it('menandai rendemen di atas 100% sebagai anomali data', async () => {
    mockFetchReport.mockImplementation(async (_system, type, params) => {
      const isCur = params.tglAwal?.startsWith('2026-10')
      switch (type) {
        case 'produksi-semua-mesin':
          return isCur ? produksiCur : produksiPrev
        case 'rekap-mutasi':
          return isCur ? mutasiCur : mutasiPrev
        case 'rendemen-semua-proses':
          return isCur
            ? [{ Tanggal: '2026-10-16', Input: 1, Output: 33, GRP: 'MOULDING' }]
            : rendemenPrev
        default:
          throw new Error(`unexpected report type ${type}`)
      }
    })
    const screen = await renderPage()

    await expect
      .element(screen.getByTestId('insight-anomali'))
      .toHaveTextContent('1 baris rendemen di atas 100%')
    await expect
      .element(screen.getByTestId('insight-anomali'))
      .toHaveTextContent('3.300% — MOULDING, 2026-10-16')
  })

  it('membandingkan dengan periode sebelumnya (Δ%)', async () => {
    const screen = await renderPage()

    // Produksi: 100 vs 50 -> +100%
    await expect
      .element(screen.getByTestId('delta-total-produksi'))
      .toHaveTextContent('+100%')
    // Mutasi: 90 vs 100 -> -10%
    await expect
      .element(screen.getByTestId('delta-mutasi'))
      .toHaveTextContent('-10%')
  })

  it('menampilkan kalimat insight produksi', async () => {
    const screen = await renderPage()

    await expect
      .element(screen.getByTestId('insight-produksi'))
      .toHaveTextContent('naik 100%')
  })

  it('hanya memanggil laporan sistem WPS', async () => {
    await renderPage()

    await vi.waitFor(() => {
      const calls = mockFetchReport.mock.calls
      expect(calls.length).toBeGreaterThan(0)
      for (const [system] of calls) {
        expect(system).toBe('wps')
      }
    })
  })

  it('memperbarui KPI saat periode diganti', async () => {
    const screen = await renderPage()

    await expect
      .element(screen.getByTestId('kpi-total-produksi'))
      .toHaveTextContent('100')

    const picker = screen.getByRole('button', { name: /Pilih periode/ })
    await picker.click()
    await screen.getByRole('button', { name: 'September' }).click()

    // Bulan 2026-09: cur memakai fixture "prev" (Output 50) — Δ 0%
    await expect
      .element(screen.getByTestId('kpi-total-produksi'))
      .toHaveTextContent('50')
  })

  it('menandai data periode lama saat periode baru belum termuat', async () => {
    // Periode lain menggantung: jembatan keepPreviousData (data periode lama)
    // tidak boleh tampil seolah sudah termuat.
    mockFetchReport.mockImplementation(async (_system, type, params) => {
      // Hanya periode 2026-10 (cur) & 2026-09 (prev awal) yang dijawab;
      // periode lain menggantung agar efek "data lama masih tampil" muncul.
      const known =
        params.tglAwal?.startsWith('2026-10') ||
        params.tglAwal?.startsWith('2026-09')
      if (known) {
        const isCur = params.tglAwal?.startsWith('2026-10')
        switch (type) {
          case 'produksi-semua-mesin':
            return isCur ? produksiCur : produksiPrev
          case 'rekap-mutasi':
            return isCur ? mutasiCur : mutasiPrev
          case 'rendemen-semua-proses':
            return isCur ? rendemenCur : rendemenPrev
          default:
            throw new Error(`unexpected report type ${type}`)
        }
      }
      return new Promise(() => {})
    })
    const screen = await renderPage()

    await expect
      .element(screen.getByTestId('kpi-total-produksi'))
      .toHaveTextContent('100')

    const picker = screen.getByRole('button', { name: /Pilih periode/ })
    await picker.click()
    await screen.getByRole('button', { name: 'November' }).click()

    await expect
      .element(screen.getByTestId('insight-produksi'))
      .toHaveTextContent('Memuat data produksi…')
    expect(document.querySelector('[data-testid="insight-anomali"]')).toBeNull()
  })
})
