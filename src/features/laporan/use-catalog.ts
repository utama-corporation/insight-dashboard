import { useQuery } from '@tanstack/react-query'
import { fetchCatalog, type CatalogGroup } from '@/lib/api'

/** Katalog laporan per sistem — muat sekali, hidup 5 menit dari cache. */
export function useCatalog(system: 'wps' | 'pps') {
  return useQuery({
    queryKey: ['catalog', system],
    queryFn: () => fetchCatalog(system),
    staleTime: 5 * 60 * 1000,
  })
}

export type { CatalogGroup }
