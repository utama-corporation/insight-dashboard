import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { fetchReport } from '@/lib/api'
import { DirectionProvider } from '@/context/direction-provider'
import { LayoutProvider } from '@/context/layout-provider'
import { SearchProvider } from '@/context/search-provider'
import { ThemeProvider } from '@/context/theme-provider'
import { SidebarProvider } from '@/components/ui/sidebar'
import { PpsPage } from './index'

vi.mock('@/lib/api', () => ({
  fetchReport: vi.fn(),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    // Halaman memakai Link di dalam layout; tanpa RouterProvider di test,
    // Link dirender sebagai <a> biasa — perilaku yang diuji tetap KPI/tren.
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

// Fixture mengikuti bentuk kolom SP_LapRekapProduksi{Broker,Crusher,Gilingan,Mixer,Washing} (@PerTgl)
const snapshot = (berat: number, pcs: number) => [
  {
    DimType: 'X',
    ItemCode: 'IT-1',
    Jenis: 'X',
    Pcs: pcs,
    Berat: berat,
    IdWarehouse: 1,
  },
]

async function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return await render(
    <QueryClientProvider client={queryClient}>
      <DirectionProvider>
        <ThemeProvider>
          <SearchProvider>
            <LayoutProvider>
              <SidebarProvider>
                <PpsPage initialMonth='2026-10' />
              </SidebarProvider>
            </LayoutProvider>
          </SearchProvider>
        </ThemeProvider>
      </DirectionProvider>
    </QueryClientProvider>
  )
}

describe('PpsPage — KPI + tren per proses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchReport.mockImplementation(async (_system, type) => {
      switch (type) {
        case 'rekap-produksi-broker':
          return snapshot(1200, 300)
        case 'rekap-produksi-crusher':
          return snapshot(800, 200)
        case 'rekap-produksi-gilingan':
          return snapshot(600, 150)
        case 'rekap-produksi-mixer':
          return snapshot(400, 100)
        case 'rekap-produksi-washing':
          return snapshot(200, 50)
        default:
          throw new Error(`unexpected report type ${type}`)
      }
    })
  })

  it('menampilkan KPI per proses (Berat) dari snapshot', async () => {
    const screen = await renderPage()

    await expect
      .element(screen.getByTestId('kpi-proses-broker'))
      .toHaveTextContent('1.200')
    await expect
      .element(screen.getByTestId('kpi-proses-crusher'))
      .toHaveTextContent('800')
    await expect
      .element(screen.getByTestId('kpi-proses-gilingan'))
      .toHaveTextContent('600')
    await expect
      .element(screen.getByTestId('kpi-proses-mixer'))
      .toHaveTextContent('400')
    await expect
      .element(screen.getByTestId('kpi-proses-washing'))
      .toHaveTextContent('200')
  })

  it('menampilkan grafik tren per proses', async () => {
    const screen = await renderPage()

    await expect
      .element(screen.getByTestId('tren-produksi-pps'))
      .toBeInTheDocument()
  })

  it('menampilkan kalimat insight tren', async () => {
    const screen = await renderPage()

    // Fixture konstan per hari -> rata-rata 3 vs 3 hari identik -> stabil
    await expect
      .element(screen.getByTestId('insight-produksi'))
      .toHaveTextContent('stabil dalam 7 hari terakhir')
  })

  it('hanya memanggil laporan sistem PPS', async () => {
    await renderPage()

    await vi.waitFor(() => {
      const calls = mockFetchReport.mock.calls
      expect(calls.length).toBeGreaterThan(0)
      for (const [system] of calls) {
        expect(system).toBe('pps')
      }
    })
  })
})
