import { createFileRoute } from '@tanstack/react-router'
import { PpsPage } from '@/features/pps'

export const Route = createFileRoute('/_authenticated/pps/')({
  component: PpsPage,
})
