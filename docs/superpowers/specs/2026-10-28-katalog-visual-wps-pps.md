# Desain — Katalog Visual WPS & PPS (semua laporan jadi tampilan visual)

## Intent & why

Manager ingin seluruh laporan dua sistem (WPS ±200 SP, PPS ±65 SP dari katalog
5007) tersedia sebagai tampilan visual + insight. Membangun halaman custom per
laporan tidak masuk akal; arsitekturnya: **satu renderer generik + config per
laporan + submenu katalog per sistem**. Laporan baru = entri config (+ grant).

## Status akses (faktor pembatas, terverifikasi probe)

- Akun `insight_ro` BUKAN db_owner; percobaan self-GRANT = no-op (HAS_PERMS 0,
  `sys.database_permissions` class 3 kosong). **Grant harus oleh DBA.**
- Saat ini hanya 8 SP ber-grant (WPS: produksi V1, rekap mutasi V2, rendemen;
  PPS: 5 rekap produksi). 199+60 SP lain menunggu grant.
- Script grant untuk DBA disertakan (`server/scripts/grant-catalog.ts`):
  schema-level `GRANT EXECUTE ON SCHEMA::dbo TO [insight_ro]` + varian per-SP
  dari katalog. Eksekusi DBA = seluruh katalog menyala tanpa deploy baru.

## Goals

1. Submenu per sistem (WPS: 16 grup, PPS: 14 grup — dari struktur katalog 5007)
   memuat seluruh laporan; yang belum ber-grant tampil terkunci dengan nama SP.
2. Halaman laporan generik: form params sesuai bentuk SP (period / as-of /
   snapshot / param khusus), tampilan visual otomatis:
   - KPI ringkas dari kolom numerik (maks 4),
   - chart (batang per kategori / garis per tanggal — auto dari bentuk kolom),
   - tabel lengkap, 
   - insight otomatis (total, Δ% vs periode sebelumnya bila period, item
     terbesar/terendah) dalam bahasa Indonesia.
3. Dashboard custom yang sudah ada (WPS & PPS) tetap jadi halaman utama tiap
   sistem; katalog jadi submenu di bawahnya.
4. Server: whitelist `reports.yaml` diperluas dari katalog; ParamType ditambah
   `string`/`int` + mapping nama-param SP bila beda (contoh: `UsingMode`).

## Non-goals

- Mengubah SP database.
- Laporan per-dokumen (surat jalan, lembar upah, per nomor produksi) tetap
  tidak dikustom — cukup generik bila SP-nya ber-grant.
- Auth/akses per laporan.

## Constraints

- Tanpa dependency baru (recharts sudah ada).
- Query generik tetap melewati whitelist server + cache 5 menit.
- Ukuran config: dibuat dari data katalog + probe (bentuk kolom nyata).

## Approaches (dianggap)

1. **Halaman custom per laporan** — paling tajam visualnya, tapi ±200 SP =
   tidak realistis; ditolak.
2. **Renderer generik + config katalog** — dipilih: sekaligus menangani semua
   laporan, laporan baru = config; tradeoff: visual standar (KPI+chart+tabel).
3. **Meneruskan PDF 5007 via iframe** — butuh token/auth, bukan tampilan data
   hidup; ditolak.

## Bagian "how" yang diputus (kubilang sendiri)

- Sumber katalog: digenerate dari openapi.json + halaman docs 5007 →
  `server/reports.catalog.yaml` (type, judul, SP, bentuk params, grup) —
  di-commit agar reproducible; script regenerate disertakan.
- Renderer: satu komponen `ReportView` (deteksi kolom: dimension = kolom
  string/berlabel non-tanggal; measure = kolom numerik; Tanggal → time axis).
- Route: `/wps/laporan/:type` & `/pps/laporan/:type` + submenu sidebar.
- Server: `ParamType` baru `int` & `string`; mapping `spName` opsional per param.

## Yang tersisa untuk builder (dicek waktu eksekusi)

- Daftar final grup → laporan (urutan submenu) mengikuti halaman katalog 5007.
- Penamaan unit/satuan pada KPI dari judul laporan bila terdeteksi (kg/m³/%).
- Pengujian: unit renderer (deteksi bentuk), satu test e2e-ish halaman
  generik dengan mock, test server ParamType baru.

## Risiko

- SP berparameter khusus (noProduksi dsb.) di luar 4 bentuk utama: generik
  tetap bisa (form dinamis dari config), tapi hanya Period/AsOf/None yang
  divalidasi matang; lainnya ditandai eksperimental di UI.
- Sebelum DBA menjalankan grant: 199+60 laporan akan error 500 di UI →
  ditampilkan sebagai "menunggu grant" (bukan crash).
