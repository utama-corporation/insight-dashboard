// Tailwind dimuat di sini — tanpa ini viewport iframe test (414px) menjadikan
// grid popover satu baris melebar keluar viewport dan tombol tak terjangkau.
import '@/styles/index.css'
// Resolusi '@vitest/browser/context' diberikan pemuat browser-mode saat run;
// pnpm tak meng-hoist paketnya sehingga tsc tidak menemukan deklarasinya.
// @ts-expect-error — modul ada saat runtime (browser mode)
import { userEvent } from '@vitest/browser/context'
import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { MonthPicker } from './month-picker'

describe('MonthPicker', () => {
  it('memilih bulan dan menutup popover saat bulan diklik', async () => {
    const onChange = vi.fn()
    const screen = await render(
      <MonthPicker value='2026-10' onChange={onChange} />
    )

    const trigger = screen.getByRole('button', { name: /Pilih periode/ })
    await expect.element(trigger).toHaveTextContent('Oktober 2026')

    await trigger.click()
    await screen.getByRole('button', { name: 'September' }).click()

    expect(onChange).toHaveBeenCalledWith('2026-09')
    // Popover tutup setelah memilih.
    await expect
      .element(screen.getByRole('button', { name: 'September' }))
      .not.toBeInTheDocument()
  })

  it('navigasi tahun mengubah kandidat bulan', async () => {
    const onChange = vi.fn()
    const screen = await render(
      <MonthPicker value='2026-10' onChange={onChange} />
    )

    await screen.getByRole('button', { name: /Pilih periode/ }).click()
    await screen.getByRole('button', { name: 'Tahun sebelumnya' }).click()
    await screen.getByRole('button', { name: 'Januari' }).click()

    expect(onChange).toHaveBeenCalledWith('2025-01')
  })

  it('nama aksesibel memuat teks yang terlihat (Label-in-Name, WCAG 2.5.3)', async () => {
    const onChange = vi.fn()
    const screen = await render(
      <MonthPicker value='2026-10' onChange={onChange} />
    )
    await expect
      .element(
        screen.getByRole('button', { name: /Pilih periode: Oktober 2026/ })
      )
      .toBeInTheDocument()
  })

  it('tekan Escape menutup popover tanpa mengubah nilai', async () => {
    const onChange = vi.fn()
    const screen = await render(
      <MonthPicker value='2026-10' onChange={onChange} />
    )

    const trigger = screen.getByRole('button', { name: /Pilih periode/ })
    await trigger.click()
    await userEvent.keyboard('{Escape}')

    expect(onChange).not.toHaveBeenCalled()
    await expect
      .element(screen.getByRole('button', { name: 'September' }))
      .not.toBeInTheDocument()
  })
})
