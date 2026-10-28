# Chart Caption (WPS) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (terpilih memang sebelumnya: cara native).

**Goal:** Menambah satu baris keterangan di bawah ketiga chart WPS yang menjelaskan makna warna & cara membaca chart.

**Architecture:** `CategoryCard` mendapat prop `keterangan?: string` (render `text-xs text-muted-foreground` setelah chart, `data-testid='keterangan-<chartId>'`); ketiga chart memasok teks sesuai spec.

**Tech Stack:** React 19, recharts (tetap), tailwind.

**Spec:** docs/superpowers/specs/2026-10-28-chart-caption-keterangan.md

## Global Constraints

- Teks persis dari spec (3 kalimat).
- Tanpa dependency baru; header insight tidak berubah.

## Review Focus

- Keterangan tidak muncul bila data gagal dimuat (chart tak render) — otomatis (caption di dalam kartu) — direview manual oleh reviewer.
- Teks mutasi menyebut "tidak menyorot" — pin di test mutasi.

---

### Task 1: Test keterangan (RED)

**Files:** Modify `src/features/wps/wps-category.test.tsx`
- Tambah 3 asersi (produksi/mutasi/rendemen): `screen.getByTestId('keterangan-chart-produksi-mesin')` dsb. `toHaveTextContent` kata kunci spec ("perubahan % terbesar", "murni peringkat", "rendemen terendah").
- Run: gagal (prop keterangan tidak ada).

### Task 2: Implementasi (GREEN)

**Files:** Modify `src/features/wps/components/category-charts.tsx`
- `CategoryCard` prop `keterangan`; `<p className='mt-2 text-xs text-muted-foreground'>` setelah chart div; testid.
- Ketiga chart memasok kalimat spec.
- Run: src/features/wps lulus semua; tsc/prettier/eslint bersih; commit `feat: keterangan warna & insight di bawah chart wps`.

### Task 3: Push ke PR & verifikasi visual

- Push cabang (PR #11 ter-update); REA screenshot kartu produksi+rendemen untuk memastikan keterangan tampil.
