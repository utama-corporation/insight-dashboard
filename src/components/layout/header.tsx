import { cn } from '@/lib/utils'
import { SidebarTrigger } from '@/components/ui/sidebar'

type HeaderProps = React.HTMLAttributes<HTMLElement>

export function Header({ className, children, ...props }: HeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-12 items-center gap-2 border-b bg-background px-3',
        className
      )}
      {...props}
    >
      <SidebarTrigger className='-ms-1 size-8' />
      <div className='ms-auto flex items-center gap-1'>{children}</div>
    </header>
  )
}
