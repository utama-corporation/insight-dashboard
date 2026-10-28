# Insight Dashboard

Dashboard analitik **read-only** untuk manajemen: satu halaman per Sistem — `/wps` (Wood Processing System) dan `/pps` (Plastic Production System) — berisi KPI periode, perbandingan dengan periode sebelumnya, insight berbasis aturan, dan grafik per kategori.

Data diambil langsung dari database SQL Server tiap Sistem melalui layanan `/server` yang hanya menjalankan stored procedure dalam whitelist, memakai akun read-only.

## Prasyarat

- Node.js 22+ dan pnpm
- Akses database Production tiap Sistem dengan akun read-only

## Menjalankan

```bash
pnpm install

# client — opsional, default sudah http://localhost:3001
cp .env.example .env

# server — wajib, isi kredensial read-only per Sistem
cp server/.env.example server/.env

# jalankan client + server sekaligus
pnpm dev:all
```

Client: `http://localhost:5173` — API: `http://localhost:3001` (health check `GET /health`).

Alternatif dua terminal: `pnpm dev` (client) dan `pnpm dev:server` (server).
Untuk build lalu jalankan sekali: `pnpm --filter server start`.

## Verifikasi

```bash
pnpm build && pnpm lint && pnpm test && pnpm knip
pnpm --filter server lint && pnpm --filter server build && pnpm --filter server test
```

Validasi seluruh SP whitelist ke Production (butuh `server/.env`):

```bash
pnpm --filter server validate
```

## Struktur

- `src/` — client Vite/React: halaman `features/wps`, `features/pps`, seam API di `lib/api.ts`.
- `server/` — Express + `mssql`; whitelist laporan di `server/reports.yaml`.
- `CONTEXT.md` — glossary domain (Sistem, Metrik, Insight, Server, WPS, PPS).
- `docs/agents/` — konvensi kerja agent (issue, label, domain).

## Keamanan

- Hanya database **Production**; kredensial hanya di `server/.env` (gitignored) — jangan pernah di-commit.
- Akun read-only: `db_datareader` + `GRANT EXECUTE` per stored procedure.
- Report type dan params di luar whitelist ditolak server (400).
- Belum ada autentikasi di fase ini; seam route `_authenticated` disiapkan untuk fase berikutnya.

## Lisensi

MIT. Berbasis [shadcn-admin](https://github.com/satnaing/shadcn-admin) oleh [@satnaing](https://github.com/satnaing).
