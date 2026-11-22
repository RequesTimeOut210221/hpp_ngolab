-- ==============================================================================
-- Migrasi 008: Ekosistem Ngolab — Modul Finansial, HPP 3-Tier, & Pricing Engine
-- Database: ngola_geasture_adm
-- ==============================================================================

USE `ngola_geasture_adm`;

-- 1. Master Bahan Baku & Konversi Satuan
CREATE TABLE IF NOT EXISTS `hpp_master_ingredients` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `item_id` VARCHAR(64) NULL,
  `name` VARCHAR(150) NOT NULL,
  `purchase_unit` VARCHAR(50) NOT NULL,
  `purchase_price` DECIMAL(12,2) NOT NULL,
  `usage_unit` VARCHAR(50) NOT NULL,
  `conversion_ratio` DECIMAL(12,4) NOT NULL,
  `cost_per_usage_unit` DECIMAL(12,4) NOT NULL,
  `avco_price` DECIMAL(12,4) NOT NULL,
  `yield_percentage` DECIMAL(5,2) DEFAULT 100.00,
  `category` ENUM('bahan_baku', 'bumbu', 'kemasan', 'operasional') NOT NULL DEFAULT 'bahan_baku',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_hpp_ingredients_cat` (`category`),
  KEY `idx_hpp_ingredients_item` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Master Resep & Struktur Biaya 3-Tier
CREATE TABLE IF NOT EXISTS `hpp_recipes` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `menu_id` INT NULL,
  `name` VARCHAR(150) NOT NULL,
  `category` ENUM('makanan_berat', 'camilan', 'minuman', 'bakso_mie', 'subassembly') NOT NULL DEFAULT 'makanan_berat',
  `portion_yield` DECIMAL(8,2) DEFAULT 1.00,
  `packaging_cost` DECIMAL(10,2) DEFAULT 0,
  `cooking_gas_cost` DECIMAL(10,2) DEFAULT 0,
  `labor_cost` DECIMAL(10,2) DEFAULT 0,
  `is_subassembly` TINYINT(1) DEFAULT 0,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_hpp_recipes_menu` (`menu_id`),
  KEY `idx_hpp_recipes_cat` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. Detail Komposisi Bahan Resep
CREATE TABLE IF NOT EXISTS `hpp_recipe_ingredients` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `recipe_id` VARCHAR(64) NOT NULL,
  `ingredient_id` VARCHAR(64) NULL,
  `subassembly_recipe_id` VARCHAR(64) NULL,
  `quantity` DECIMAL(10,4) NOT NULL,
  `unit` VARCHAR(50) NOT NULL,
  `notes` VARCHAR(100) NULL,
  CONSTRAINT `fk_recipe_ing_recipe` FOREIGN KEY (`recipe_id`) REFERENCES `hpp_recipes`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_recipe_ing_ingredient` FOREIGN KEY (`ingredient_id`) REFERENCES `hpp_master_ingredients`(`id`) ON DELETE SET NULL,
  KEY `idx_recipe_ing_sub` (`subassembly_recipe_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. Buku Kas Harian & Pembelian Bahan (Cashbook)
CREATE TABLE IF NOT EXISTS `hpp_cashflow` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `entry_date` DATE NOT NULL,
  `type` ENUM('cash_in', 'cash_out') NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `ingredient_id` VARCHAR(64) NULL,
  `quantity` DECIMAL(10,3) NULL,
  `unit_price` DECIMAL(12,2) NULL,
  `total_amount` DECIMAL(12,2) NOT NULL,
  `receipt_url` VARCHAR(255) NULL,
  `created_by` VARCHAR(100) NOT NULL DEFAULT 'Admin',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_cashflow_date` (`entry_date`),
  KEY `idx_cashflow_type` (`type`),
  KEY `idx_cashflow_ingredient` (`ingredient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 5. Riwayat Perubahan & Audit Penyesuaian Harga
CREATE TABLE IF NOT EXISTS `hpp_price_sync_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `menu_id` INT NOT NULL,
  `menu_name` VARCHAR(150) NOT NULL,
  `old_price` DECIMAL(10,2) NOT NULL,
  `new_price` DECIMAL(10,2) NOT NULL,
  `applied_margin_percent` DECIMAL(5,2) NOT NULL,
  `synced_by` VARCHAR(100) NOT NULL,
  `synced_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_sync_menu` (`menu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==============================================================================
-- SEEDING DATA MASTER BAHAN BAKU (48 BAHAN DARI DATASET RIIL)
-- ==============================================================================
INSERT INTO `hpp_master_ingredients` 
(`id`, `name`, `purchase_unit`, `purchase_price`, `usage_unit`, `conversion_ratio`, `cost_per_usage_unit`, `avco_price`, `yield_percentage`, `category`) 
VALUES
('ing-beras', 'Beras', 'kg', 15500.00, 'gr', 968.7500, 16.0000, 16.0000, 100.00, 'bahan_baku'),
('ing-telur', 'Telur Ayam', 'kg', 26277.78, 'butir', 16.0000, 1642.0000, 1642.0000, 100.00, 'bahan_baku'),
('ing-ayam-fillet', 'Daging Ayam (Dada Fillet)', 'kg', 46000.00, 'gr', 1000.0000, 46.0000, 46.0000, 95.00, 'bahan_baku'),
('ing-ayam-wings', 'Sayap Ayam (Wings)', 'kg', 38300.00, 'gr', 1000.0000, 38.3000, 38.3000, 100.00, 'bahan_baku'),
('ing-ayam-karkas', 'Ayam Utuh (Karkas)', 'Ekor (1 kg)', 36000.00, 'potong', 4.0000, 9000.0000, 9000.0000, 100.00, 'bahan_baku'),
('ing-ayam-frozen', 'Ayam Frozen', 'Bungkus (1 kg)', 35700.00, 'potong', 8.0000, 4463.0000, 4463.0000, 100.00, 'bahan_baku'),
('ing-dada-utuh', 'Dada Ayam Utuh', 'Bungkus (1 kg)', 46000.00, 'bungkus', 1.0000, 46000.0000, 46000.0000, 100.00, 'bahan_baku'),
('ing-bakso-sapi', 'Bakso Sapi Super', 'Pack (36 pcs)', 35656.25, 'butir', 36.0000, 990.0000, 990.0000, 100.00, 'bahan_baku'),
('ing-sosis-ayam', 'Sosis Ayam', 'Pack (15 pcs)', 17500.00, 'pcs', 15.0000, 1167.0000, 1167.0000, 100.00, 'bahan_baku'),
('ing-indomie', 'Indomie / Mie Instan', 'Bungkus', 3290.00, 'bks', 1.0000, 3290.0000, 3290.0000, 100.00, 'bahan_baku'),
('ing-mie-yamien', 'Mie Basah / Yamien', 'kg', 22000.00, 'porsi', 6.6667, 3300.0000, 3300.0000, 100.00, 'bahan_baku'),
('ing-kentang-ff', 'Kentang Goreng', 'kg', 29000.00, 'gr', 1000.0000, 29.0000, 29.0000, 100.00, 'bahan_baku'),
('ing-minyak-goreng', 'Minyak Goreng', 'Pouch (2 Liter)', 41200.00, 'ml', 2000.0000, 20.6000, 20.6000, 100.00, 'bahan_baku'),
('ing-daging-rendang', 'Daging Sapi (Rendang)', 'kg', 149000.00, 'gr', 1000.0000, 149.0000, 149.0000, 90.00, 'bahan_baku'),
('ing-daging-teriyaki', 'Daging Sapi Slice (Teriyaki)', 'kg', 136000.00, 'gr', 1000.0000, 136.0000, 136.0000, 95.00, 'bahan_baku'),
('ing-daging-dendeng', 'Daging Sapi (Dendeng)', 'kg', 149000.00, 'gr', 1000.0000, 149.0000, 149.0000, 90.00, 'bahan_baku'),
('ing-shrimp-roll', 'Shrimp Roll', 'Pack (10 pcs)', 27500.00, 'porsi', 5.0000, 5500.0000, 5500.0000, 100.00, 'bahan_baku'),
('ing-udang-keju', 'Udang Keju', 'Pack (10 pcs)', 30000.00, 'porsi', 5.0000, 6000.0000, 6000.0000, 100.00, 'bahan_baku'),
('ing-chicken-katsu', 'Chicken Katsu (Homemade)', 'Pcs (Produksi)', 4125.00, 'pcs', 1.0000, 4125.0000, 4125.0000, 100.00, 'bahan_baku'),
('ing-teri-medan', 'Ikan Teri Medan', 'kg', 66275.00, 'gr', 1000.0000, 66.2800, 66.2800, 95.00, 'bahan_baku'),
('ing-bawang-merah', 'Bawang Merah', 'kg', 30941.18, 'gr', 1000.0000, 30.9400, 30.9400, 85.00, 'bumbu'),
('ing-bawang-putih', 'Bawang Putih', 'kg', 35703.70, 'gr', 1000.0000, 35.7000, 35.7000, 85.00, 'bumbu'),
('ing-cabe-keriting', 'Cabe Merah Keriting', 'kg', 52022.73, 'gr', 1000.0000, 52.0200, 52.0200, 90.00, 'bumbu'),
('ing-kopi-espresso', 'Kopi Bubuk / Espresso', 'kg', 125000.00, 'shot', 55.5556, 2250.0000, 2250.0000, 100.00, 'bahan_baku'),
('ing-susu-uht', 'Susu UHT Full Cream', 'Kotak (946 ml)', 23000.00, 'ml', 946.0000, 24.3100, 24.3100, 100.00, 'bahan_baku'),
('ing-gula-aren', 'Gula Aren Cair', 'Liter (1000 ml)', 35000.00, 'ml', 1000.0000, 35.0000, 35.0000, 100.00, 'bahan_baku'),
('ing-coklat-bubuk', 'Bubuk Coklat Premium', 'kg', 75000.00, 'porsi', 33.3333, 2250.0000, 2250.0000, 100.00, 'bahan_baku'),
('ing-teh-celup', 'Teh Celup / Melati', 'Pack (25 pcs)', 10000.00, 'kantong', 25.0000, 400.0000, 400.0000, 100.00, 'bahan_baku'),
('ing-jeruk-peras', 'Jeruk Peras Segar', 'kg', 20000.00, 'porsi', 6.6667, 3000.0000, 3000.0000, 80.00, 'bahan_baku'),
('ing-strawberry', 'Strawberry Segar', 'Pack (500 gr)', 22500.00, 'porsi', 5.0000, 4500.0000, 4500.0000, 90.00, 'bahan_baku'),
('ing-sayur-campur', 'Sayuran Kol & Wortel', 'kg', 10394.12, 'gr', 1000.0000, 10.3900, 10.3900, 85.00, 'bumbu'),
('ing-kecap-manis', 'Kecap Manis', 'Pouch (520 ml)', 24475.00, 'ml', 520.0000, 47.0700, 47.0700, 100.00, 'bumbu'),
('ing-garam', 'Garam Dapur', 'Bungkus (250 gr)', 2000.00, 'gr', 250.0000, 8.0000, 8.0000, 100.00, 'bumbu'),
('ing-royco', 'Masako / Royco (Penyedap)', 'Bungkus (250 gr)', 9550.00, 'gr', 250.0000, 38.2000, 38.2000, 100.00, 'bumbu'),
('ing-santan-kara', 'Santan Kelapa (Kara)', 'Kotak (200 ml)', 18480.00, 'ml', 200.0000, 92.4000, 92.4000, 100.00, 'bumbu'),
('ing-gula-pasir', 'Gula Pasir / Kemasan', 'kg', 27750.00, 'gr', 1000.0000, 27.7500, 27.7500, 100.00, 'bumbu'),
('ing-saus-sambal', 'Saus Sambal / Cabai', 'Pouch (1 kg)', 26100.00, 'gr', 1000.0000, 26.1000, 26.1000, 100.00, 'bumbu'),
('ing-mayones', 'Mayones', 'Pouch (1 kg)', 27916.67, 'gr', 1000.0000, 27.9200, 27.9200, 100.00, 'bumbu'),
('ing-terigu', 'Tepung Terigu', 'kg', 15600.00, 'gr', 1000.0000, 15.6000, 15.6000, 100.00, 'bahan_baku'),
('ing-tepung-roti', 'Tepung Roti', 'Pack (250 gr)', 11875.00, 'gr', 250.0000, 47.5000, 47.5000, 100.00, 'bahan_baku'),
('ing-kerupuk', 'Kerupuk Kaleng', 'Bungkus', 13333.33, 'porsi', 20.0000, 667.0000, 667.0000, 100.00, 'bahan_baku'),
('ing-lalapan', 'Lalapan (Timun & Selada)', 'Porsi', 870.00, 'porsi', 1.0000, 870.0000, 870.0000, 100.00, 'bahan_baku')
ON DUPLICATE KEY UPDATE 
  `purchase_price` = VALUES(`purchase_price`),
  `cost_per_usage_unit` = VALUES(`cost_per_usage_unit`),
  `avco_price` = VALUES(`avco_price`);

-- ==============================================================================
-- SEEDING RESEP & STRUKTUR 3-TIER MENU
-- ==============================================================================
INSERT INTO `hpp_recipes` 
(`id`, `menu_id`, `name`, `category`, `portion_yield`, `packaging_cost`, `cooking_gas_cost`, `labor_cost`, `is_subassembly`, `notes`) 
VALUES
('rec-sub-katsu', NULL, 'Chicken Katsu (Produksi 1 Batch 24 Pcs)', 'subassembly', 24.00, 500.00, 500.00, 0, 1, 'Produk antara untuk Nasi Bento Katsu & Nasi Goreng Katsu'),
('rec-nasgor-polos', 1, 'Nasi Goreng Tanpa Telur', 'makanan_berat', 1.00, 500.00, 500.00, 0, 0, 'Menu pokok hemat'),
('rec-nasi-omelet', 2, 'Nasi Omelet', 'makanan_berat', 1.00, 500.00, 500.00, 0, 0, 'Nasi dengan telur dadar gurih'),
('rec-omelet', 3, 'Omelet (Telur 2 Butir)', 'camilan', 1.00, 500.00, 500.00, 0, 0, 'Camilan telur dadar'),
('rec-shrimp-roll', 4, 'Shrimp Roll', 'camilan', 1.00, 500.00, 500.00, 0, 0, 'Gorengan olahan udang'),
('rec-udang-keju', 5, 'Udang Keju', 'camilan', 1.00, 500.00, 500.00, 0, 0, 'Gorengan udang isi keju lumer'),
('rec-kentang-sosis', 6, 'Kentang + Sosis', 'camilan', 1.00, 500.00, 500.00, 0, 0, 'French fries shoestring dengan sosis ayam'),
('rec-mie-double-telur', 7, 'Mie Double + Telur', 'makanan_berat', 1.00, 500.00, 500.00, 0, 0, 'Indomie double porsi + 1 telur'),
('rec-nasgor-ketumbar', 8, 'Nasi Goreng Ayam Ketumbar', 'makanan_berat', 1.00, 500.00, 500.00, 0, 0, 'Nasi goreng dengan potongan ayam marinasi ketumbar'),
('rec-bento-katsu', 9, 'Nasi Bento Katsu', 'makanan_berat', 1.00, 1500.00, 800.00, 0, 0, 'Menu signature box bento ayam katsu'),
('rec-bento-shrimp', 10, 'Nasi Bento Shrimp Roll', 'makanan_berat', 1.00, 1500.00, 800.00, 0, 0, 'Menu signature box bento shrimp roll'),
('rec-nasgor-katsu', 11, 'Nasi Goreng Katsu', 'makanan_berat', 1.00, 800.00, 700.00, 0, 0, 'Nasi goreng spesial dengan topping chicken katsu'),
('rec-mie-kentang', 12, 'Mie Goreng Kentang', 'makanan_berat', 1.00, 500.00, 500.00, 0, 0, 'Indomie goreng dipadu kentang'),
('rec-omelet-1telur', 13, 'Omelet Dadar (1 Telur)', 'camilan', 1.00, 300.00, 300.00, 0, 0, 'Telur dadar 1 butir'),
('rec-telur-ceplok', 14, 'Telur Ceplok', 'camilan', 1.00, 200.00, 300.00, 0, 0, 'Sunny side up'),
('rec-wings-hotlava', 15, 'Chicken Wing Hot Lava', 'makanan_berat', 1.00, 800.00, 800.00, 0, 0, 'Sayap ayam crispy bersaus pedas hot lava'),
('rec-nasi-ayam-baput', 16, 'Nasi Ayam Goreng Bawang Putih', 'makanan_berat', 1.00, 800.00, 800.00, 0, 0, 'Ayam goreng harum bawang putih'),
('rec-indomie-tektek', 17, 'Indomie Tek-Tek', 'bakso_mie', 1.00, 800.00, 600.00, 0, 0, 'Indomie kuah nyemek khas gerobak'),
('rec-indomie-dokdok', 18, 'Indomie Dokdok', 'bakso_mie', 1.00, 800.00, 600.00, 0, 0, 'Indomie kuah kental telur dokdok'),
('rec-indomie-telur', 19, 'Indomie Goreng + Telur', 'bakso_mie', 1.00, 500.00, 500.00, 0, 0, 'Indomie goreng klasik dengan telur'),
('rec-nasgor-teri', 20, 'Nasi Goreng Teri Medan', 'makanan_berat', 1.00, 600.00, 600.00, 0, 0, 'Nasi goreng gurih asin teri medan'),
('rec-kopi-aren', 23, 'Kopi Gula Aren', 'minuman', 1.00, 800.00, 300.00, 0, 0, 'Espresso susu segar dengan sirup aren murni'),
('rec-americano', 24, 'Americano', 'minuman', 1.00, 800.00, 200.00, 0, 0, 'Double shot espresso dengan air dingin/panas'),
('rec-es-coklat', 26, 'Es Coklat', 'minuman', 1.00, 800.00, 300.00, 0, 0, 'Coklat premium kental dengan susu UHT'),
('rec-es-teh', 28, 'Es Teh Manis', 'minuman', 1.00, 700.00, 0, 0, 0, 'Teh melati wangi dingin porsi jumbo'),
('rec-bakso-kuah', 29, 'Bakso Kuah (5 Butir)', 'bakso_mie', 1.00, 1000.00, 700.00, 0, 0, 'Bakso sapi super kuah kaldu rempah'),
('rec-mie-bakso', 30, 'Mie Bakso Kuah', 'bakso_mie', 1.00, 1000.00, 700.00, 0, 0, 'Mie basah kenyal dengan bakso sapi kuah'),
('rec-mie-yamien', 33, 'Mie Yamien Manis/Asin', 'bakso_mie', 1.00, 1000.00, 700.00, 0, 0, 'Yamien khas dengan daging ayam cincang'),
('rec-rendang-sapi', 37, 'Rendang Sapi', 'makanan_berat', 1.00, 0, 1500.00, 0, 0, 'Daging rendang santan gurih meresap'),
('rec-ayam-bakar', 38, 'Ayam Bakar Kecap', 'makanan_berat', 1.00, 800.00, 1000.00, 0, 0, 'Ayam bakar bumbu kecap gurih')
ON DUPLICATE KEY UPDATE 
  `packaging_cost` = VALUES(`packaging_cost`),
  `cooking_gas_cost` = VALUES(`cooking_gas_cost`),
  `portion_yield` = VALUES(`portion_yield`);

-- ==============================================================================
-- SEEDING KOMPOSISI BAHAN RESEP (CONTOH REPRESENTATIF)
-- ==============================================================================
-- Resep 1: Sub-Assembly Chicken Katsu
INSERT INTO `hpp_recipe_ingredients` (`recipe_id`, `ingredient_id`, `quantity`, `unit`, `notes`) VALUES
('rec-sub-katsu', 'ing-dada-utuh', 0.0417, 'bungkus', '1 bungkus dibagi 24 potong'),
('rec-sub-katsu', 'ing-terigu', 8.3333, 'gr', 'Tepung pelapis'),
('rec-sub-katsu', 'ing-tepung-roti', 10.4167, 'gr', 'Breadcrumbs'),
('rec-sub-katsu', 'ing-telur', 0.0417, 'butir', 'Perekat'),
('rec-sub-katsu', 'ing-minyak-goreng', 25.0000, 'ml', 'Minyak penggorengan');

-- Resep 9: Nasi Bento Katsu (Memakai Katsu sebagai Sub-Assembly)
INSERT INTO `hpp_recipe_ingredients` (`recipe_id`, `ingredient_id`, `subassembly_recipe_id`, `quantity`, `unit`, `notes`) VALUES
('rec-bento-katsu', 'ing-beras', NULL, 200.0000, 'gr', 'Porsi nasi'),
('rec-bento-katsu', 'ing-chicken-katsu', 'rec-sub-katsu', 1.0000, 'pcs', 'Lauk utama chicken katsu'),
('rec-bento-katsu', 'ing-sayur-campur', NULL, 50.0000, 'gr', 'Salad kol & wortel'),
('rec-bento-katsu', 'ing-mayones', NULL, 20.0000, 'gr', 'Dressing salad'),
('rec-bento-katsu', 'ing-saus-sambal', NULL, 15.0000, 'gr', 'Saus cocolan'),
('rec-bento-katsu', 'ing-minyak-goreng', NULL, 25.0000, 'ml', 'Minyak penggorengan');

-- Resep 23: Kopi Gula Aren
INSERT INTO `hpp_recipe_ingredients` (`recipe_id`, `ingredient_id`, `quantity`, `unit`, `notes`) VALUES
('rec-kopi-aren', 'ing-kopi-espresso', 1.0000, 'shot', 'Espresso double extraction'),
('rec-kopi-aren', 'ing-susu-uht', 134.0000, 'ml', 'Fresh milk UHT'),
('rec-kopi-aren', 'ing-gula-aren', 25.0000, 'ml', 'Gula aren cair asli');

-- ==============================================================================
-- SEEDING AWAL SALDO BUKU KAS (CASHFLOW)
-- ==============================================================================
INSERT INTO `hpp_cashflow` (`id`, `entry_date`, `type`, `description`, `total_amount`, `created_by`) VALUES
('cf-seed-modal-1', '2026-07-10', 'cash_in', 'Modal Awal Kasir & Dapur', 500000.00, 'Owner'),
('cf-seed-modal-2', '2026-07-14', 'cash_in', 'Penambahan Modal Operasional', 1000000.00, 'Owner'),
('cf-seed-belanja-1', '2026-07-10', 'cash_out', 'Belanja Bawang & Cabe Pasar', 65000.00, 'Kasir'),
('cf-seed-belanja-2', '2026-07-10', 'cash_out', 'Dada Ayam Utuh 4 Pack', 192000.00, 'Kasir'),
('cf-seed-belanja-3', '2026-07-13', 'cash_out', 'Beras RE 10kg', 155000.00, 'Kasir')
ON DUPLICATE KEY UPDATE `total_amount` = VALUES(`total_amount`);
