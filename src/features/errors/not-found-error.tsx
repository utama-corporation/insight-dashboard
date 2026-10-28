import { useNavigate, useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function NotFoundError() {
  const navigate = useNavigate()
  const { history } = useRouter()
  return (
    <div className='flex min-h-[60vh] flex-col items-center justify-center gap-2 px-4 text-center'>
      <h1 className='text-2xl font-semibold tracking-tight'>
        Halaman tidak ditemukan
      </h1>
      <p className='text-sm text-muted-foreground'>
        Alamat yang dibuka tidak ada atau sudah dipindahkan.
      </p>
      <div className='mt-4 flex gap-2'>
        <Button variant='outline' onClick={() => history.go(-1)}>
          Kembali
        </Button>
        <Button onClick={() => navigate({ to: '/' })}>Ke WPS</Button>
      </div>
    </div>
  )
}
