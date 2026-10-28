import { useNavigate, useRouter } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type GeneralErrorProps = React.HTMLAttributes<HTMLDivElement> & {
  minimal?: boolean
}

export function GeneralError({
  className,
  minimal = false,
}: GeneralErrorProps) {
  const navigate = useNavigate()
  const { history } = useRouter()
  return (
    <div
      className={cn(
        'flex min-h-[60vh] flex-col items-center justify-center gap-2 px-4 text-center',
        className
      )}
    >
      <h1 className='text-2xl font-semibold tracking-tight'>
        Terjadi kesalahan
      </h1>
      <p className='text-sm text-muted-foreground'>
        Kami mohon maaf atas ketidaknyamanan ini. Coba lagi nanti.
      </p>
      {!minimal && (
        <div className='mt-4 flex gap-2'>
          <Button variant='outline' onClick={() => history.go(-1)}>
            Kembali
          </Button>
          <Button onClick={() => navigate({ to: '/' })}>Ke WPS</Button>
        </div>
      )}
    </div>
  )
}
