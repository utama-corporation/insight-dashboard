import { Package, Trees } from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: 'Sistem',
      items: [
        {
          title: 'WPS',
          url: '/wps',
          icon: Trees,
        },
        {
          title: 'PPS',
          url: '/pps',
          icon: Package,
        },
      ],
    },
  ],
}
