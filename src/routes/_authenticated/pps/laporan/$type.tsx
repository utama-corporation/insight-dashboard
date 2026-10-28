import { createFileRoute } from '@tanstack/react-router'
import { LaporanPage } from '@/features/laporan/page'

function RouteComponent() {
  const { type } = Route.useParams()
  return <LaporanPage system='pps' type={type} />
}

export const Route = createFileRoute('/_authenticated/pps/laporan/$type')({
  component: RouteComponent,
})
