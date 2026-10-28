# Polish Insight & Kecepatan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (mode native, seperti dua plan sebelumnya).

**Goal:** Empat polish terpilih: cache klien 5 menit, insight WPS berangka, realisasi terendah per mesin, insight PPS absolut.

**Architecture:** S2 satu konstanta di `main.tsx`; I1 pakai `labelPeriode` yang diekspor dari `month-picker.tsx`; I2 helper murni baru di `category-insights.ts` + kalimat gabungan di chart; I3 satu template kalimat di `pps/index.tsx`.

**Tech Stack:** TanStack Query, React 19, vitest browser-mode.

**Spec:** docs/superpowers/specs/2026-10-28-polish-insight-kecepatan.md

## Global Constraints

- Teks gagal ('Gagal memuat data…') & memuat ('Memuat data produksi…') tidak berubah.
- Tanpa dependency baru; SP database tidak disentuh.

## Review Focus

- `labelPeriode` salah bulan saat rollover tahun (Des→Jan) — pin via test I1 dengan fixture Desember.
- Realisasi mesin dengan Target 0 tidak boleh memicu pembagian nol (weightedPct sudah aman; pin via asersi fixture B 40%).
- Insight PPS saat total 0 → memakai percabangan `deltaTren === 0` yang sudah ada; pastikan total tetap tampil.

---

### Task 1: RED — asersi teks baru

**Files:** Modify `src/features/wps/wps-page.test.tsx` (I1), `src/features/wps/wps-category.test.tsx` (I2), `src/features/pps/pps-page.test.tsx` (I3)

- I1: update/`it` baru — `insight-produksi` memuat `Produksi Oktober 2026: 100 m³ — naik 100% dibanding September 2026 (50)`.
- I2: `insight-mesin` memuat `Realisasi terendah: MESIN B (40%)`.
- I3: `insight-produksi` PPS memuat `Produksi plastik 7 hari: <total> kg —` (total dari fixture).
- Run: gagal (teks lama).

### Task 2: GREEN — implementasi

**Files:** Modify `src/main.tsx` (S2), `src/features/wps/month-picker.tsx` (ekspor labelPeriode), `src/features/wps/index.tsx` (I1), `src/features/wps/category-insights.ts` + `src/features/wps/components/category-charts.tsx` (I2), `src/features/pps/index.tsx` (I3)

- Run: src/features/{wps,pps} + lib lulus; tsc/prettier/eslint bersih; commit `feat: insight berangka & cache klien 5 menit`; push (PR #11 ter-update).

### Task 3: Verifikasi runtime (REA)

- Screenshot WPS + PPS untuk memastikan kalimat baru tampil; lapor hasil.
