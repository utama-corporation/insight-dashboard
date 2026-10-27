# Insight Server

Layanan Server Insight Dashboard: menjalankan **stored procedure dari whitelist** di database SQL Server tiap Sistem dan mengembalikan hasilnya sebagai JSON.

## Menjalankan

```bash
pnpm install
cp .env.example .env   # isi kredensial read-only (#YOUR_READ_ONLY_USER)
pnpm --filter server dev
```

Server berjalan di `http://localhost:3001`. Health check: `GET /health`.

Contoh request:

```bash
curl -X POST http://localhost:3001/api/wps/reports/produksi-semua-mesin \
  -H "Content-Type: application/json" \
  -d '{"params": {"tglAwal": "2026-10-01", "tglAkhir": "2026-10-27"}}'
```

## Menambah Sistem baru

1. Tambah blok di `reports.yaml`:

   ```yaml
   nama-sistem:
     database: NAMA_DATABASE
     reports:
       - type: nama-laporan
         procedure: SP_NamaProcedure
         params:
           - name: tglAwal
             type: date
   ```

2. Tambah `NAMA_SISTEM_CONNECTION_STRING` di `.env`.

Tidak ada kode yang perlu diubah.

## Menambah laporan baru pada Sistem yang ada

Tambah entry `reports` di `reports.yaml` — selesai.

## Keamanan

- Hanya SP dalam whitelist yang bisa dijalankan; type/params di luar whitelist ditolak (400).
- Params dikirim sebagai typed input (bukan string concat) — tidak ada celah SQL injection.
- Gunakan akun SQL read-only (mis. `#YOUR_READ_ONLY_USER`): `db_datareader` + `GRANT EXECUTE` per SP. Jangan pernah memakai akun tulis.
- Kredensial hanya di `.env` (tidak di-commit).
