import { createFileRoute } from '@tanstack/react-router'
import { WpsPage } from '@/features/wps'

export const Route = createFileRoute('/_authenticated/wps/')({
  component: WpsPage,
})
