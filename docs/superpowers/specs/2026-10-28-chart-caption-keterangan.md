# Desain — Keterangan Warna & Insight di Bawah Chart (WPS)

## Niat

Warna biru (`--chart-1`) di chart WPS sengaja dipakai sebagai satu-satunya aksen
prinsip "achromatic ledger", tetapi maknanya hanya tersirat di kalimat header.
Eksplicitkan: tiap kartu chart mendapat kalimat keterangan **di bawah chart**
yang menjelaskan warna + cara membacanya.

## Data (apa yang sudah ditemukan)

- `ProductionMachineChart`: biru = mesin dengan Δ% terbesar (naik ATAUKAH turun)
  vs periode sebelumnya (`topMover`); abu-abu = lainnya.
- `MutationCategoryChart`: semua batang netral — chart murni peringkat komposisi
  stok snapshot terakhir; tanpa sorotan.
- `RendemenGroupChart`: biru = GRP dengan rendemen tertimbang terendah.

## Goals

- Satu baris keterangan `text-xs text-muted-foreground` di bawah tiap chart
  (dalam `CardContent`, setelah chart), prop `keterangan` pada `CategoryCard`.
- Test: asersi teks keterangan muncul untuk ketiga chart.

## Non-goals

- Mengubah math/insight header (tetap).
- Legend chips/graphical legend.
- Perubahan warna token.

## Approaches (dianggap)

1. **Teks keterangan di bawah chart** — dipilih; paling langsung memenuhi permintaan.
2. Legend chip grafis + teks — makan ruang, redundan.
3. Ubah header saja — tidak memenuhi "di bawah chart".

## Teks keterangan (final kalimat)

1. Produksi: "Biru = mesin dengan perubahan % terbesar vs bulan lalu (naik maupun turun); abu-abu = mesin lainnya. Panjang batang = total output bulan ini."
2. Mutasi: "Semua batang abu-abu — chart ini murni peringkat komposisi stok akhir (kg) dan tidak menyorot satu kategori."
3. Rendemen: "Biru = grup proses dengan rendemen terendah (fokus perhatian); abu-abu = lainnya. Rendemen = Output ÷ Input × 100 tertimbang per grup."
