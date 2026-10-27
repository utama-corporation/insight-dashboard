# Insight Dashboard

Dashboard analitik read-only untuk manajemen utama-corporation: memantau metrik operasional lintas Sistem di satu tempat, plus Insight agar keputusan bisa diambil lebih cepat. Bukan aplikasi operasional — hanya membaca dan menganalisis data.

## Language

**Sistem**:
Sumber data eksternal yang memiliki database sendiri; satu Sistem = satu database. Contoh: WPS, PPS. Daftar Sistem terbuka untuk penambahan.
_Avoid_: datasource, integrasi, sumber

**WPS**:
Wood Processing System — Sistem pabrik kayu. Kategori laporannya: Produksi, Mutasi, Stock, Rendemen.
_Avoid_: pabrik kayu, sawmill (sebagai nama sistem)

**PPS**:
Plastic Production System — Sistem pabrik plastik. Laporan V1 berfokus pada Produksi Harian per Proses (broker, crusher, gilingan, mixer, washing).
_Avoid_: pabrik plastik

**Metrik**:
Angka operasional dari sebuah Sistem yang divisualisasikan sebagai chart, KPI, atau tren.
_Avoid_: data, statistik

**Insight**:
Metrik tervisualisasi plus ringkasan sederhana berbasis aturan: perbandingan dengan periode sebelumnya, penanda anomali, dan catatan temuan. Bukan output AI generatif.
_Avoid_: analisis otomatis, kesimpulan AI

**Server**:
Layanan backend di folder `/server` yang menjalankan Stored Procedure pada database tiap Sistem dan mengubah hasilnya menjadi JSON untuk dikonsumsi client.
_Avoid_: backend, API layer
