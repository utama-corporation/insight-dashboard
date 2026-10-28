# Desain — Perbaikan Tafsir Data WPS (berdasarkan probe SP live)

## Temuan (bukti DB via server/.env read-only)

- SP yang dipakai project = valid per katalog 5007 DAN satu-satunya yang ber-grant
  EXECUTE untuk akun read-only (V2 produksi, cross-tab mutasi, rendemen-non-rambung
  = EXECUTE denied → butuh grant DBA bila mau).
- "Aneh" berasal dari salah tafsir kolom di frontend:
  1. KPI "Mutasi Total (kg)" = `TotalAkhir` hari terakhir = **stok akhir**,
     didominasi `KBKG` (kayu bulat, satuan kg) yang dijumlahkan dengan kategori m³.
  2. Realisasi 27% = Output ÷ Target dengan target harian dijumlahkan 28 hari
     penuh, meski mesin hanya berproduksi 2–20 hari (target hari non-aktif ikut).
  3. Banner "anomali rendemen >100%" per baris harian — pola buffer WIP membuat
     Output > Input itu normal; agregat bulanan S4S 112%.

## Perbaikan (frontend, tanpa ganti SP)

1. KPI mutasi → label **"Stok Akhir (m³)"**: Σ kategori `MUTASI_KEYS` (tanpa KBKG)
   pada baris tanggal terakhir; caption memuat `KB kg: <KBKG>`; Δ% antar periode.
2. Chart mutasi: judul `(kg)` → `(m³)`; keterangan ditambah catatan KBKG (kg) dikecualikan.
3. Realisasi: hitung hanya dari baris **hari aktif** (Output terisi & Target > 0);
   label KPI → "Realisasi vs Target (hari aktif)".
4. Banner rendemen → **rendemen bulanan per GRP**: tandai GRP dengan Σout/Σin > 100;
   kalimat menjelaskan buffer WIP (bukan "anomali data error").

## Non-goals

- Tidak mengganti SP (permission denied; perlu grant DBA — dicatat untuk user).
- Tidak menyentuh PPS (data PPS terverifikasi wajar).

## Tes

- wps-page.test: KPI tidak mencampur KBKG; banner teks baru; realisasi tetap 50% (fixture aktif semua).
- wps-category.test: keterangan mutasi menyebut KBKG dikecualikan.
