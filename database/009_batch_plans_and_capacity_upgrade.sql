-- ==============================================================================
-- Migrasi 009: Ekosistem Ngolab — Rencana Batch Produksi, Kapasitas Dapur & Fee Platform
-- Database: ngola_geasture_adm
-- Target Eksekusi: Integrasi Rekomendasi Fitur Unggulan Template HPP
-- ==============================================================================

USE `ngola_geasture_adm`;

-- 1. Tambah Kolom Tambahan pada Master Bahan (Stock, Min Stock, Package Size, Supplier Link)
SET @dbname = DATABASE();
SET @tablename = 'hpp_master_ingredients';

-- Kolom current_stock
SET @col = 'current_stock';
SET @query = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col) > 0,
    'SELECT 1',
    'ALTER TABLE `hpp_master_ingredients` ADD COLUMN `current_stock` DECIMAL(12,2) NOT NULL DEFAULT 50.00 AFTER `yield_percentage`'
));
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Kolom min_stock
SET @col = 'min_stock';
SET @query = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col) > 0,
    'SELECT 1',
    'ALTER TABLE `hpp_master_ingredients` ADD COLUMN `min_stock` DECIMAL(12,2) NOT NULL DEFAULT 10.00 AFTER `current_stock`'
));
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Kolom package_size (Ukuran Isi Kemasan Beli, misal: 160 untuk keju 160g, 1000 untuk 1kg)
SET @col = 'package_size';
SET @query = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col) > 0,
    'SELECT 1',
    'ALTER TABLE `hpp_master_ingredients` ADD COLUMN `package_size` DECIMAL(10,2) NOT NULL DEFAULT 1.00 AFTER `purchase_unit`'
));
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Kolom source_link (Toko / Supplier / Shopee / Pasar)
SET @col = 'source_link';
SET @query = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col) > 0,
    'SELECT 1',
    'ALTER TABLE `hpp_master_ingredients` ADD COLUMN `source_link` VARCHAR(255) NULL AFTER `category`'
));
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Update stok awal bahan utama agar kalkulator kapasitas dapur langsung berfungsi
UPDATE `hpp_master_ingredients` SET `current_stock` = 15.00, `source_link` = 'Pasar Induk Kramat Jati' WHERE `id` = 'ing-ayam-fillet';
UPDATE `hpp_master_ingredients` SET `current_stock` = 45.00, `source_link` = 'Agen Beras Barokah' WHERE `id` = 'ing-beras';
UPDATE `hpp_master_ingredients` SET `current_stock` = 8.50, `source_link` = 'Toko Bahan Kue 88' WHERE `id` = 'ing-kopi-blend';
UPDATE `hpp_master_ingredients` SET `current_stock` = 24.00, `source_link` = 'Distributor Fresh Milk' WHERE `id` = 'ing-susu-fresh';
UPDATE `hpp_master_ingredients` SET `current_stock` = 120.00, `source_link` = 'Peternak Telur Blitar' WHERE `id` = 'ing-telur-ayam';
UPDATE `hpp_master_ingredients` SET `current_stock` = 12.00, `source_link` = 'Agen Minyak Sawit' WHERE `id` = 'ing-minyak-goreng';
UPDATE `hpp_master_ingredients` SET `current_stock` = 5.00, `source_link` = 'Pasar Tradisional' WHERE `id` = 'ing-cabe-merah-keriting';
UPDATE `hpp_master_ingredients` SET `current_stock` = 4.00, `source_link` = 'Pasar Tradisional' WHERE `id` = 'ing-bawang-merah';
UPDATE `hpp_master_ingredients` SET `current_stock` = 3.50, `source_link` = 'Pasar Tradisional' WHERE `id` = 'ing-bawang-putih';

-- 2. Tabel Rencana Produksi (Batch Production Plans)
CREATE TABLE IF NOT EXISTS `hpp_production_plans` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `title` VARCHAR(150) NOT NULL,
  `plan_date` DATE NOT NULL,
  `status` ENUM('draft', 'completed') NOT NULL DEFAULT 'draft',
  `global_margin` DECIMAL(5,2) DEFAULT 50.00,
  `global_fee_type` ENUM('percent', 'flat') DEFAULT 'percent',
  `global_fee_value` DECIMAL(10,2) DEFAULT 0,
  `total_cost` DECIMAL(12,2) DEFAULT 0,
  `total_revenue` DECIMAL(12,2) DEFAULT 0,
  `notes` TEXT NULL,
  `created_by` VARCHAR(100) DEFAULT 'Admin',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_plan_date` (`plan_date`),
  KEY `idx_plan_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. Detail Item Menu dalam Rencana Produksi
CREATE TABLE IF NOT EXISTS `hpp_production_plan_items` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `plan_id` VARCHAR(64) NOT NULL,
  `recipe_id` VARCHAR(64) NOT NULL,
  `quantity` DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  `margin_percent` DECIMAL(5,2) DEFAULT 50.00,
  `fee_type` ENUM('percent', 'flat') DEFAULT 'percent',
  `fee_value` DECIMAL(10,2) DEFAULT 0,
  `cost_per_unit` DECIMAL(12,2) DEFAULT 0,
  `total_cost` DECIMAL(12,2) DEFAULT 0,
  `suggested_price` DECIMAL(12,2) DEFAULT 0,
  `total_revenue` DECIMAL(12,2) DEFAULT 0,
  CONSTRAINT `fk_plan_item_plan` FOREIGN KEY (`plan_id`) REFERENCES `hpp_production_plans`(`id`) ON DELETE CASCADE,
  KEY `idx_plan_item_recipe` (`recipe_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. Sample Seed Rencana Produksi Awal
INSERT INTO `hpp_production_plans` (`id`, `title`, `plan_date`, `status`, `global_margin`, `global_fee_type`, `global_fee_value`, `total_cost`, `total_revenue`, `notes`, `created_by`)
VALUES 
  ('plan-prep-pagi-01', 'Batch Prep Shift Pagi (Signature Dish)', CURDATE(), 'draft', 50.00, 'percent', 20.00, 314500.00, 786250.00, 'Perencanaan porsi jam makan siang & delivery GoFood', 'Admin Tangolab')
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

INSERT INTO `hpp_production_plan_items` (`plan_id`, `recipe_id`, `quantity`, `margin_percent`, `fee_type`, `fee_value`, `cost_per_unit`, `total_cost`, `suggested_price`, `total_revenue`)
VALUES
  ('plan-prep-pagi-01', 'REC-01', 25.00, 50.00, 'percent', 20.00, 12582.00, 314550.00, 31455.00, 786375.00)
ON DUPLICATE KEY UPDATE `quantity` = VALUES(`quantity`);
