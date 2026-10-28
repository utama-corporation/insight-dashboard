import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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

// Fixture Lapisan 2: produksi per mesin dua periode, mutasi per kategori,
// rendemen per GRP — bentuk kolom sesuai SP tervalidasi.
const produksiCur = [
  {
    Tanggal: '2026-10-02',
    NamaMesin: 'MESIN A',
    Target: 100,
    Input: 100,
    Output: 60,
    Rend: 60,
  },
  {
    Tanggal: '2026-10-03',
    NamaMesin: 'MESIN B',
    Target: 100,
    Input: 100,
    Output: 40,
    Rend: 40,
  },
]
const produksiPrev = [
  {
    Tanggal: '2026-09-02',
    NamaMesin: 'MESIN A',
    Target: 100,
    Input: 100,
    Output: 80,
    Rend: 80,
  },
  {
    Tanggal: '2026-09-03',
    NamaMesin: 'MESIN B',
    Target: 100,
    Input: 100,
    Output: 20,
    Rend: 20,
  },
]
const mutasiCur = [
  {
    Tanggal: '2026-10-26',
    S4S: 30,
    ST: 20,
    BJadi: 10,
    LMT: 5,
    MLD: 4,
    FJ: 3,
    SAND: 2,
    CCAkhir: 1,
    KB: 50,
    KBKG: 5000,
    TotalAkhir: 90,
  },
]
const rendemenCur = [
  { Tanggal: '2026-10-27', Input: 100, Output: 60, GRP: 'S4S' },
  { Tanggal: '2026-10-27', Input: 100, Output: 30, GRP: 'MLD' },
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

describe('WpsPage — Lapisan 2 per kategori', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchReport.mockImplementation(async (_system, type, params) => {
      const isCur = params.tglAwal?.startsWith('2026-10')
      switch (type) {
        case 'produksi-semua-mesin':
          return isCur ? produksiCur : produksiPrev
        case 'rekap-mutasi':
          return isCur ? mutasiCur : mutasiCur
        case 'rendemen-semua-proses':
          return isCur ? rendemenCur : rendemenCur
        default:
          throw new Error(`unexpected report type ${type}`)
      }
    })
  })

  it('menampilkan insight mover terbesar per mesin dari data produksi', async () => {
    const screen = await renderPage()

    // MESIN A: 60 vs 80 (-25%), MESIN B: 40 vs 20 (+100%) -> terbesar B
    await expect
      .element(screen.getByTestId('insight-mesin'))
      .toHaveTextContent('Perubahan terbesar: MESIN B (+100%)')
    // Realisasi vs target: A 60/100 = 60%, B 40/100 = 40% -> terendah B
    await expect
      .element(screen.getByTestId('insight-mesin'))
      .toHaveTextContent('Realisasi terendah: MESIN B (40%)')
  })

  it('menampilkan chart tren produksi per mesin', async () => {
    const screen = await renderPage()

    await expect
      .element(screen.getByTestId('chart-produksi-mesin'))
      .toBeInTheDocument()
  })

  it('menampilkan komposisi mutasi per kategori + insight kategori terbesar', async () => {
    const screen = await renderPage()

    await expect
      .element(screen.getByTestId('chart-mutasi-kategori'))
      .toBeInTheDocument()
    // KB = 50 kg adalah kategori terbesar (KBKG & TotalAkhir dikecualikan)
    await expect
      .element(screen.getByTestId('insight-mutasi'))
      .toHaveTextContent('Komposisi terbesar: KB (50)')
  })

  it('menampilkan rendemen per GRP + insight GRP terendah', async () => {
    const screen = await renderPage()

    await expect
      .element(screen.getByTestId('chart-rendemen-grp'))
      .toBeInTheDocument()
    // MLD = 30% < S4S 60%
    await expect
      .element(screen.getByTestId('insight-rendemen'))
      .toHaveTextContent('Rendemen terendah: MLD (30%)')
  })

  it('menjelaskan makna warna di bawah ketiga chart', async () => {
    const screen = await renderPage()

    await expect
      .element(screen.getByTestId('keterangan-chart-produksi-mesin'))
      .toHaveTextContent('perubahan % terbesar vs bulan lalu')
    await expect
      .element(screen.getByTestId('keterangan-chart-mutasi-kategori'))
      .toHaveTextContent('murni peringkat komposisi stok akhir')
    // KBKG (kayu bulat kg) tidak ikut — satuannya kg, bukan m³
    await expect
      .element(screen.getByTestId('keterangan-chart-mutasi-kategori'))
      .toHaveTextContent('KBKG')
    await expect
      .element(screen.getByTestId('keterangan-chart-rendemen-grp'))
      .toHaveTextContent('rendemen terendah')
  })
})
