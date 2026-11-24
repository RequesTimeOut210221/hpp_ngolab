# hpp_ngolab — Modul Finansial, HPP & Pricing Engine Ekosistem Ngolab

Repositori resmi untuk **`hpp_ngolab`**, platform manajemen finansial, kalkulasi Harga Pokok Penjualan (HPP) 3-tier, simulasi penetapan harga jual ber-margin target, pencatatan buku kas belanja harian, serta analisis selisih realisasi laba kotor retrospektif untuk ekosistem **Ngolab**.

Repository URL: [https://github.com/RequesTimeOut210221/hpp_ngolab](https://github.com/RequesTimeOut210221/hpp_ngolab)  
Live Production URL: [https://hpp.ngolab.online](https://hpp.ngolab.online)

---

## 🌟 Fitur Utama
1. **Buku Kas & Belanja Harian (Default Landing View):**
   - Pencatatan transaksi belanja pasar harian (Kas Masuk & Kas Keluar).
   - Otomatisasi pembaruan nilai *Latest Purchase Price* dan *Moving Average Cost (AVCO)*.
   - Ekspor Buku Kas Harian langsung ke format spreadsheet Excel (`.xlsx`).
2. **Mesin Penilaian Ganda (Dual Valuation Engine):**
   - **AVCO:** Untuk akuntansi persediaan dan laporan keuangan bulanan.
   - **Latest Purchase Price:** Untuk batas aman penetapan harga jual saat terjadi lonjakan harga bahan baku di pasar.
3. **Simulator Margin, Channel Penjualan & Pricing Interaktif:**
   - Slider persentase Gross Margin (20% - 85%) dan Food Cost Ratio.
   - **Simulasi Platform Fee & Konsinyasi:** Preset komisi online delivery (GoFood/GrabFood 20%, ShopeeFood 20%), kantin kampus (10%), atau titip jual warung (flat Rp 2.000) dengan kalkulasi otomatis markup harga jual konsumen agar laba bersih resto tetap utuh.
   - **Deteksi Kapasitas Dapur & Bottleneck:** Menampilkan kapasitas porsi siap saji real-time dan peringatan bahan kritis (*low stock / out of stock*).
   - Sinkronisasi instan ke POS Kasir (`backend_ngolab` & `PointLab`).
4. **Resep Manufaktur 3-Tier & Sub-Assembly (WIP):**
   - Komposisi bertingkat: Menu Akhir (Level 1) $\rightarrow$ Bahan Olahan / Subassembly (Level 2) $\rightarrow$ Bahan Baku Mentah (Level 3).
   - Ekspor Lembar Standar Operasional Dapur (**SOP PDF**) 1-klik dengan tabel takaran saji dan estimasi biaya per porsi.
5. **Rencana Batch Produksi & Daftar Belanja Pasar Gabungan (`/planner`):**
   - Perencanaan produksi batch untuk pesanan porsi besar, event katering, atau shift pagi.
   - Agregasi kebutuhan bahan baku secara rekursif ke satuan beli pasar (`kg`, `liter`, `slop`).
   - Ekspor lembar rencana produksi ke format PDF dan Excel multi-sheet (`.xlsx`).
   - **1-Click Salin ke Buku Kas Belanja** untuk langsung mengonversi estimasi belanja menjadi pengeluaran kas operasional shift.
   - Eksekusi rencana dengan otomatisasi pemotongan stok bahan baku di gudang.
6. **Rekonsiliasi Realisasi Laba Kotor Retrospektif:**
   - Membandingkan HPP Teoretis (porsi terjual di kasir $\times$ HPP resep) vs Belanja Riil kas.
   - Mendeteksi pemborosan (*food waste*), porsi berlebih (*overportioning*), dan selisih bahan.
7. **Autentikasi & Hak Akses:**
   - Laman login khusus dengan proteksi peran (*Super Admin*, *Admin*, dan staf manajerial).
   - Tampilan akun dan peran aktif di sidebar bawah.

---

## 🛠️ Stack Teknologi & Alokasi Port
- **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS v4, Lucide React, Recharts.
  - **Dev Port:** `http://localhost:5177`
- **Backend Service:** Node.js, Express, TypeScript (`tsx`), MySQL2.
  - **API Port:** `http://localhost:5002`
- **Database:** Terhubung langsung ke database master MySQL 8.4 `ngola_geasture_adm`.
- **Autentikasi:** Single Sign-On (SSO) berbagi *shared secret* (`AUTH_TOKEN_SECRET`) dengan `backend_ngolab`.

---

## 📚 Dokumentasi Terkait
- **Data Acuan Master HPP & Resep:** [Docs/hpp-logistik/HPP_MASTER_DATA.md](file:///f:/College/PABW/Ngolab/Docs/hpp-logistik/HPP_MASTER_DATA.md)
- **Spesifikasi Teknis & Rencana Implementasi:** [Docs/hpp-logistik/HPP_SPECIFICATION_AND_PLAN.md](file:///f:/College/PABW/Ngolab/Docs/hpp-logistik/HPP_SPECIFICATION_AND_PLAN.md)
- **Indeks Dokumentasi Ekosistem:** [Docs/INDEX.md](file:///f:/College/PABW/Ngolab/Docs/INDEX.md)
