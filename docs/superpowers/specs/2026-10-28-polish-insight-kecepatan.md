# Desain — Polish kecepatan & insight manager (backend + frontend)

## Niat

Hasil akhir: data terasa instan bagi manager dan kalimat insight membawa
angka keputusan — bukan hanya persen.

## Temuan pengukuran (dasar keputusan)

- PPS 35 panggilan unik = **156 ms** (53 ms cache) — cepat; restrukturisasi PPS TIDAK dilakukan.
- WPS bulan dingin ~3,6 s (SP di DB) — sudah dikompensasi cache server 5 menit + pool hangat.
- Gap nyata: `staleTime` klien 30 s ≠ cache server 5 menit → refetch frekuen padahal cache server masih hangat.

## Perubahan

1. **S2 (klien):** `staleTime` global 30 s → 5 menit (selaras TTL server default).
2. **I1 (WPS):** kalimat insight membawa angka:
   `Produksi Oktober 2026: 865,4 m³ — turun 33% dibanding September 2026 (1.378,4).`
   (label bulan dipakai ulang dari MonthPicker — `labelPeriode` diekspor; stabil → "…— stabil dibanding … (x)." gagal/memuat tidak berubah.)
3. **I2 (WPS chart produksi):** insight header menambah mesin realisasi terendah
   (kolom `Target` sudah ada di SP): `Perubahan terbesar: A (+109%). Realisasi terendah: B (12%).`
   Helper baru `lowestRealisasi(rows, 'NamaMesin')` di `category-insights.ts`.
4. **I3 (PPS):** insight memakai total absolut:
   `Produksi plastik 7 hari: 12.345 kg — naik 8% vs 3 hari sebelumnya.`

## Non-goals

- Menambah/ubah SP database (butuh validasi DBA — catatan #9).
- Menambah kpi halaman, warna, atau chart baru.
- Restrukturisasi pola panggilan PPS (terukur cepat).

## Approaches (dianggap)

- Boot-warm periode berjalan di server: hanya menolong 5 menit pertama TTL — ditolak.
- Menurunkan 50→35 panggilan PPS dengan menggabung KPI ke trend: mengundo keunggulan
  "KPI muncul cepat" (commit 584ec4f) untuk kasus yang sudah cepat — ditolak.
- Dipilih: S2 + I1 + I2 + I3 (kecil, terukur, teruji unit).
