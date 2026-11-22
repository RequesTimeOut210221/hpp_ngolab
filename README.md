# hpp_ngolab — Modul Finansial, HPP & Pricing Engine Ekosistem Ngolab

Repositori resmi untuk **`hpp_ngolab`**, platform manajemen finansial, kalkulasi Harga Pokok Penjualan (HPP) 3-tier, simulasi penetapan harga jual ber-margin target, pencatatan buku kas belanja harian, serta analisis selisih realisasi laba kotor retrospektif untuk ekosistem **Ngolab**.

Repository URL: [https://github.com/RequesTimeOut210221/hpp_ngolab](https://github.com/RequesTimeOut210221/hpp_ngolab)

---

## 🌟 Fitur Utama
1. **Buku Kas & Belanja Harian (Default Landing View):**
   - Pencatatan transaksi belanja pasar harian (Kas Masuk & Kas Keluar).
   - Otomatisasi pembaruan nilai *Latest Purchase Price* dan *Moving Average Cost (AVCO)*.
2. **Mesin Penilaian Ganda (Dual Valuation Engine):**
   - **AVCO:** Untuk akuntansi persediaan dan laporan keuangan bulanan.
   - **Latest Purchase Price:** Untuk batas aman penetapan harga jual saat terjadi lonjakan harga bahan baku di pasar.
3. **Simulator Margin & Pricing Interaktif:**
   - Slider persentase Gross Margin (30% - 65%) dan Food Cost Ratio.
   - Rekomendasi harga jual real-time per menu.
   - Filter Kategori Menu: *Makanan Berat*, *Camilan/Snack*, *Minuman*, dan *Bakso & Mie*.
   - **Tombol "Terapkan ke Kasir POS & PointLab"** untuk memperbarui harga jual menu master secara langsung.
4. **Resep Manufaktur 3-Tier & Sub-Assembly (WIP):**
   - Komposisi bertingkat: Bahan Pokok & Bumbu + Biaya Kemasan + Biaya Gas & Utilitas Memasak.
   - Mendukung produk setengah jadi (contoh: *Chicken Katsu* diproduksi 24 pcs/batch $\rightarrow$ digunakan sebagai bahan di *Nasi Bento Katsu* dan *Nasi Goreng Katsu*).
5. **Rekonsiliasi Realisasi Laba Kotor Retrospektif:**
   - Membandingkan HPP Teoretis (porsi terjual di kasir $\times$ HPP resep) vs Belanja Riil kas.
   - Mendeteksi pemborosan (*food waste*), porsi berlebih (*overportioning*), dan selisih bahan.

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
