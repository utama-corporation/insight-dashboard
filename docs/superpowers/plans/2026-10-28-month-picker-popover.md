# Month Picker Popover (WPS) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengganti `<input type='month'>` di halaman WPS dengan kontrol khusus: tombol label periode (id-ID) yang seluruh areanya membuka popover pilih-bulan (grid 12 bulan + navigasi tahun).

**Architecture:** Komponen kecil `MonthPicker` (state lokal `open` + `year`, nilai tetap `YYYY-MM` dari parent). Dibangun di atas primitif shadcn yang sudah ada (`Popover`, `Button`) — tanpa dependency baru. Halaman WPS hanya menukar kontrol.

**Tech Stack:** React 19, Radix UI Popover (via `src/components/ui/popover`), shadcn `Button`, lucide-react, tailwind v4, vitest browser-mode.

**Spec:** `docs/superpowers/specs/2026-10-28-month-picker-popover-design.md`

## Global Constraints

- Nilai yang diterima/berikan tetap string `YYYY-MM` ("2026-09") — tidak boleh Date.
- Nama bulan: `Januari…Desember` penuh (id-ID).
- `aria-label='Pilih periode'` tetap ada pada trigger (tested locator).
- Tidak ada dependency baru; hanya `Popover`/`Button`/lucide yang sudah terpasang.

## Review Focus

- Bulan dipilih saat popover terbuka tapi pengguna klik Escape — nili tidak boleh berubah; popover tutup (Radix; pin di test alur: setelah klik bulan label terganti, tanpa klik = tidak ganti).
- Klik luar popover menutup tanpa mengubah nilai (Radix onOpenChange; pin bersama test di atas).
- Navigasi tahun mengubah kandidat klik (klik "Januari" pada yıl 2025 menghasilkan "2025-01" — pin ke test navigasi tahun di Task 1).
- Nilai pilih diluar rentang (mis. `9999-12` dari histori) — komponen hanya menampilkan label dan menginisialisasi tahun dari nilai; tidak boleh melempar (seeded oleh test alur memperbarui KPI).
- Popover align: layar sempit (mobile) — `PopoverContent` `align='end'` + `collide` default Radix; periksa manual saat verifikasi runtime REA.

---

### Task 1: Komponen `MonthPicker`

**Files:**
- Create: `src/features/wps/month-picker.tsx`
- Test: `src/features/wps/month-picker.test.tsx`

**Interfaces:**
- Consumes: `Popover, PopoverTrigger, PopoverContent` dari `@/components/ui/popover`; `Button` dari `@/components/ui/button` (variant `outline`/`ghost`/`default`, `size='icon'`); `cn` dari `@/lib/utils`.
- Produces: `MonthPicker({ value, onChange, className }: { value: string; onChange: (next: string) => void; className?: string })` — state internal `open`, `year` (init dari `value.slice(0,4)`).

- [ ] **Step 1: Tulis test yang gagal** (`src/features/wps/month-picker.test.tsx`)

```tsx
it('memilih bulan dan menutup popover saat bulan diklik', async () => {
  render — <MonthPicker value='2026-10' onChange={spy} />
  await element getByLabelText('Pilih periode').click()
  await element getByRole('button', { name: 'September' }).click()
  expect spy dipanggil dengan '2026-09'
  kekurangan toHaveTextContent('September 2026') pada trigger
})

it('navigasi tahun mengubah kandidat bulan', async () => {
  klik trigger, klik 'Tahun sebelumnya', klik 'Januari'
  spy dipanggil dengan '2025-01'
})

it('klik luar menutup popover tanpa mengubah nilai', async () => {
  klik trigger lalu tekan Escape; label tetap 'Oktober 2026'; spy tidak dipanggil
})
```

- [ ] **Step 2: Jalankan test — gagal** (`npx vitest run src/features/wps/month-picker.test.tsx --browser.headless`) → modul tidak ada.
- [ ] **Step 3: Implementasi** `MonthPicker` sesuai Interfaces: trigger `Button variant='outline'` + `CalendarDays size-4 text-muted-foreground`; konten header (`ChevronLeft`/`ChevronRight` `size='icon'`, `aria-label='Tahun sebelumnya'/'Tahun berikutnya'`, tahun `tabular-nums`) + `grid grid-cols-3 gap-1` 12 tombol; selected `variant='default'`, lain `ghost`; klik bulan → `onChange(\`${year}-${String(m).padStart(2,'0')}\`)` + `setOpen(false)`.
- [ ] **Step 4: Jalankan test — lulus** sama perintah.
- [ ] **Step 5: Commit** `git add src/features/wps/month-picker.tsx src/features/wps/month-picker.test.tsx` → `feat: month picker popover (WPS) — klik penuh, grid 12 bulan, navigasi tahun`

### Task 2: Pasang di halaman WPS + test alur

**Files:**
- Modify: `src/features/wps/index.tsx` (ganti `Input type='month'` → `MonthPicker`; bersihkan import `Input`)
- Modify: `src/features/wps/wps-page.test.tsx` (dua test yang memakai `picker.fill`)

**Interfaces:**
- Consumes: `MonthPicker` dari Task 1.
- Produces: tidak ada — pemakaian akhir.

- [ ] **Step 1: Ubah dua test ke alur klik** — `memperbarui KPI saat periode diganti`: `await picker.click()` lalu `await page.getByRole('button', {name: 'September'}).click()`; test `menandai data periode lama…`: alur sama dengan 'November'. Expected (failed dulu): fill() tidak jalan pada Button.
- [ ] **Step 2: Jalankan kedua test → gagal** (trigger lama `Input` tidak punya popover).
- [ ] **Step 3: Pasang** `<MonthPicker value={month} onChange={setMonth} className='h-9 w-40' />`; hapus import `Input`.
- [ ] **Step 4: Jalankan seluruh suite wps → lulus** (`npx vitest run src/features/wps --browser.headless`).
- [ ] **Step 5: Verifikasi kualitas repo:** `npx tsc -b`, `npx prettier --check src/features/wps`, `npx eslint src/features/wps`.
- [ ] **Step 6: Commit** `git add src/features/wps/index.tsx src/features/wps/wps-page.test.tsx` → `feat: filter periode WPS via popover bulan`

### Task 3: Verifikasi runtime (REA)

**Files:** tidak ada (pengamatan).

- [ ] **Step 1: REA browser scenario** — `http://localhost:5173/wps`: klik `button 'Pilih periode'`, capture popover muncul; klik 'September'; tunggu data; aksesibilitas + screenshot; nilai KPI berubah memakai data September; Escape menutup tanpa mengubah.
- [ ] **Step 2: Lapor hasil** — value label, bahwa klik penuh (bukan ikon), screenshot popover.

---

*Catatan: komit Task 1–5 dirancang kumulatif di branch kerja yang sama (perubahan bugfix/perf sebelumnya masih belum dikomit oleh pengguna — jangan disempurnakan/dibawa; tambah hanya file milik plan ini).*
