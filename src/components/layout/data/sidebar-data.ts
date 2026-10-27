import {
  Bug,
  Construction,
  FileX,
  LayoutDashboard,
  Lock,
  Monitor,
  Package,
  Palette,
  ServerOff,
  Settings,
  Trees,
  UserCog,
  UserX,
  Wrench,
  Axe,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Insight Dashboard',
    email: 'utama-corporation',
    avatar: '',
  },
  teams: [
    {
      name: 'WPS',
      logo: Trees,
      plan: 'Wood Processing System',
    },
    {
      name: 'PPS',
      logo: Axe,
      plan: 'Plastic Production System',
    },
  ],
  navGroups: [
    {
      title: 'General',
      items: [
        {
          title: 'Dashboard',
          url: '/',
          icon: LayoutDashboard,
        },
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
    {
      title: 'Pages',
      items: [
        {
          title: 'Errors',
          icon: Bug,
          items: [
            {
              title: 'Unauthorized',
              url: '/errors/unauthorized',
              icon: Lock,
            },
            {
              title: 'Forbidden',
              url: '/errors/forbidden',
              icon: UserX,
            },
            {
              title: 'Not Found',
              url: '/errors/not-found',
              icon: FileX,
            },
            {
              title: 'Internal Server Error',
              url: '/errors/internal-server-error',
              icon: ServerOff,
            },
            {
              title: 'Maintenance Error',
              url: '/errors/maintenance-error',
              icon: Construction,
            },
          ],
        },
      ],
    },
    {
      title: 'Other',
      items: [
        {
          title: 'Settings',
          icon: Settings,
          items: [
            {
              title: 'Profile',
              url: '/settings',
              icon: UserCog,
            },
            {
              title: 'Account',
              url: '/settings/account',
              icon: Wrench,
            },
            {
              title: 'Appearance',
              url: '/settings/appearance',
              icon: Palette,
            },
            {
              title: 'Notifications',
              url: '/settings/notifications',
              icon: Monitor,
            },
          ],
        },
      ],
    },
  ],
}
