import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { useCatalog } from './use-catalog'

/** Tautan ter-tipe ke halaman laporan (route $type per sistem). */
function LaporanLink({
  system,
  type,
  children,
  title,
}: {
  system: 'wps' | 'pps'
  type: string
  children: React.ReactNode
  title?: string
}) {
  return system === 'wps' ? (
    <Link
      to='/wps/laporan/$type'
      params={{ type }}
      title={title}
      className='flex w-full items-center justify-between gap-2 text-xs'
    >
      {children}
    </Link>
  ) : (
    <Link
      to='/pps/laporan/$type'
      params={{ type }}
      title={title}
      className='flex w-full items-center justify-between gap-2 text-xs'
    >
      {children}
    </Link>
  )
}

/** Submenu katalog laporan satu sistem: grup katalog → laporan. */
export function NavCatalog({
  system,
  label,
}: {
  system: 'wps' | 'pps'
  label: string
}) {
  const { data: groups, isError } = useCatalog(system)
  const [open, setOpen] = useState(false)

  return (
    <SidebarGroup>
      <Collapsible open={open} onOpenChange={setOpen}>
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton aria-label={`Laporan ${label}`}>
              <span>{label}</span>
              <ChevronRight
                className={`ml-auto transition-transform ${open ? 'rotate-90' : ''}`}
              />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {isError && (
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <span className='px-2 text-xs text-muted-foreground'>
                    Katalog tidak tersedia.
                  </span>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            )}
            {groups?.map((g) => (
              <Collapsible key={g.grup}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuSubButton asChild>
                      <button
                        type='button'
                        className='flex w-full items-center justify-between text-xs'
                        aria-label={`Grup ${g.grup}`}
                      >
                        <span>{g.grup}</span>
                        <ChevronRight className='size-3.5' />
                      </button>
                    </SidebarMenuSubButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className='ml-3'>
                      {g.items.map((item) => (
                        <SidebarMenuSubItem key={item.type}>
                          <SidebarMenuSubButton asChild>
                            <LaporanLink
                              system={system}
                              type={item.type}
                              title={
                                item.catatan
                                  ? `${item.judul} — ${item.catatan}`
                                  : item.judul
                              }
                            >
                              <span className='truncate'>{item.judul}</span>
                              {item.catatan && (
                                <span className='text-[10px] text-muted-foreground'>
                                  PDF
                                </span>
                              )}
                            </LaporanLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    </SidebarGroup>
  )
}
