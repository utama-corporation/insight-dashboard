# Desain — Month Filter Interaktif (WPS)

## Niat

Filter periode halaman WPS saat ini memakai `<input type='month'>` bawaan browser.
Klik di area teks hanya memfokuskan input; popup kalender hanya buka lewat ikon
kecil (hit-target kecil), dan tampilannya mengikuti browser — dua keluhan dari
pengguna: kurang interaktif dan tidak presisi. Ganti dengan kontrol khusus.

## Goals

- Trigger tombol menampilkan periode terpilih dalam format `id-ID`: "Oktober 2026".
- **Seluruh area trigger** membuka popover (bukan hanya ikon).
- Popover: header tahun `‹ 2026 ›` + grid 12 bulan (nama penuh `id-ID`);
  bulan terpilih menonjol; klik bulan = pilih + tutup popover.
- Aksesibilitas: Radix popover (fokus, Escape, klik-luar), `aria-label` "Pilih periode" pada trigger.
- Tes unit mengikuti alur interaksi baru.

## Non-goals

- Range-picker / minggu.
- Halaman PPS (tidak punya filter).
- Menyimpan pilihan ke URL.
- Dependensi kalender baru.

## Constraint

- Nilai yang berpindah tetap string `YYYY-MM` (kompatibel `periodBounds`, queryKey, dan fixture test).

## Approaches (dianggap)

1. **Native + `showPicker()`** — paling kecil, tapi tampilan tetap bawaan browser.
2. **Lib kalender (react-day-picker)** — terlengkap, dependensi baru untuk satu picker.
3. **Popover custom pilih-bulan** — dipilih: konsisten desain sistem (Popover/Button shadcn),
   target sel besar, tanpa dependency baru.

Keputusan pengguna: opsi 3 (dipilih via percakapan).

## Kode (pemutus saya)

- Komponen: `src/features/wps/month-picker.tsx` (dipakai khusus WPS saat ini).
- API: `{ value: string; onChange(next: string): void; className?: string }`.
- Nama bulan label penuh `id-ID`; navigasi tahun tanpa batas.
- Trigger = `Button variant='outline'` + ikon kalender kanan; label "Pilih periode".
- WPS page: ganti `<Input type='month'>` → `<MonthPicker>`; import `Input` dibersihkan.
- Test: dua test yang memakai `picker.fill('2026-09')` diubah ke alur klik
  (klik trigger → klik bulan); sisanya yang fokus placeholder/Δ tetap.

## Verifikasi yang direncanakan

- Unit: vitest browser-mode lulus semua (keeper perubahan alur interaksi).
- `tsc -b`, prettier, eslint.
- Runtime: REA browser scenario — klik trigger, buka popover, pilih bulan, datanya terganti
  (web sebelum perubahan sudah terverifikasi bahwa alur data bekerja; kini alur kliknya).
