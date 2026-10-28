import { createFileRoute } from '@tanstack/react-router'
import { LaporanPage } from '@/features/laporan/page'

function RouteComponent() {
  const { type } = Route.useParams()
  return <LaporanPage system='wps' type={type} />
}

export const Route = createFileRoute('/_authenticated/wps/laporan/$type')({
  component: RouteComponent,
})
