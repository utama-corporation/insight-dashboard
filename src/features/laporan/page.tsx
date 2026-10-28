import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ThemeSwitch } from '@/components/theme-switch'
import { ReportView } from './report-view'
import { useCatalog } from './use-catalog'

/** Halaman laporan generik: ambil item katalog, render visualnya. */
export function LaporanPage({
  system,
  type,
}: {
  system: 'wps' | 'pps'
  type: string
}) {
  const { data: groups, isLoading, isError } = useCatalog(system)
  const item = groups?.flatMap((g) => g.items).find((i) => i.type === type)

  return (
    <>
      <Header>
        <ThemeSwitch />
      </Header>
      <Main>
        {isLoading && (
          <p className='text-sm text-muted-foreground'>Memuat katalog…</p>
        )}
        {isError && (
          <p className='text-sm text-negative'>
            Katalog laporan tidak tersedia.
          </p>
        )}
        {!isLoading && !isError && !item && (
          <p className='text-sm text-muted-foreground'>
            Laporan «{type}» tidak ada di katalog. Laporan multi-SP hanya
            tersedia sebagai PDF di layanan dokumentasi.
          </p>
        )}
        {item && item.catatan && (
          <p className='text-sm text-muted-foreground'>
            {item.judul} dijalankan sebagai gabungan beberapa SP ({item.catatan}
            ) — tersedia sebagai PDF di layanan dokumentasi, bukan tampilan
            visual.
          </p>
        )}
        {item && !item.catatan && (
          <ReportView key={item.type} system={system} item={item} />
        )}
      </Main>
    </>
  )
}
