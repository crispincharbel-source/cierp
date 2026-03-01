-- database/01-schema.sql
-- Create database if not exists
CREATE DATABASE IF NOT EXISTS order_tracking;
USE order_tracking;


-- Create roles table
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `role` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_unique` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create users table
CREATE TABLE IF NOT EXISTS `users` (
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(255) NOT NULL,
  `id_role` INT NOT NULL,
  `is_approved` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`email`),
  CONSTRAINT `fk_user_role` FOREIGN KEY (`id_role`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create complex table
CREATE TABLE IF NOT EXISTS `complex` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `desc` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create ink table
CREATE TABLE IF NOT EXISTS `ink` (
  `code_number` VARCHAR(50) NOT NULL,
  `supplier` VARCHAR(255) NOT NULL,
  `color` VARCHAR(255) NOT NULL,
  `code` VARCHAR(50),
  `pal_number` VARCHAR(50),
  `date` VARCHAR(50),
  `batch_palet_number` VARCHAR(50),
  `is_finished` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`code_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create solvent table
CREATE TABLE IF NOT EXISTS `solvent` (
  `code_number` VARCHAR(50) NOT NULL,
  `supplier` VARCHAR(255) NOT NULL,
  `product` VARCHAR(255) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `pal_number` VARCHAR(50),
  `date` VARCHAR(50) NOT NULL,
  `batch_palet_number` VARCHAR(50),
  `is_finished` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`code_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create cutting table
CREATE TABLE IF NOT EXISTS `cutting` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_number` VARCHAR(50) NOT NULL,
  `batch_number` VARCHAR(50) NOT NULL,
  `machine` VARCHAR(100) NOT NULL,
  `customer_name` VARCHAR(255) NOT NULL,
  `operator_name` VARCHAR(255) NOT NULL,
  `zipper_number` VARCHAR(50),
  `slider_number` VARCHAR(50),
  `date` VARCHAR(50) NOT NULL,
  `speed` FLOAT,
  `uom` VARCHAR(20),
  `quantity` FLOAT,
  `waste` FLOAT,
  `notes` TEXT,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_cutting_order_number` (`order_number`),
  INDEX `idx_cutting_batch_number` (`batch_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create lamination table
CREATE TABLE IF NOT EXISTS `lamination` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_number` VARCHAR(50) NOT NULL,
  `batch_number` VARCHAR(50) NOT NULL,
  `machine` VARCHAR(100) NOT NULL,
  `customer_name` VARCHAR(255) NOT NULL,
  `operator_name` VARCHAR(255) NOT NULL,
  `glue_number` VARCHAR(50),
  `hardner_number` VARCHAR(50),
  `date` VARCHAR(50) NOT NULL,
  `complex` VARCHAR(255), -- Changed from INT to VARCHAR(255)
  `glue_speed` FLOAT,
  `machine_speed` FLOAT,
  `meters` FLOAT,
  `weight` FLOAT,
  `waste` FLOAT,
  `glue_weight` FLOAT,
  `hardner_weight` FLOAT,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_lamination_order_number` (`order_number`),
  INDEX `idx_lamination_batch_number` (`batch_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create printing table
CREATE TABLE IF NOT EXISTS `printing` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_number` VARCHAR(50) NOT NULL,
  `batch_number` VARCHAR(50) NOT NULL,
  `machine` VARCHAR(100) NOT NULL,
  `customer_name` VARCHAR(255) NOT NULL,
  `operator_name` VARCHAR(255) NOT NULL,
  `ink_1` VARCHAR(50),
  `ink_2` VARCHAR(50),
  `ink_3` VARCHAR(50),
  `ink_4` VARCHAR(50),
  `ink_5` VARCHAR(50),
  `ink_6` VARCHAR(50),
  `ink_7` VARCHAR(50),
  `ink_8` VARCHAR(50),
  `solvent_1` VARCHAR(50),
  `solvent_2` VARCHAR(50),
  `solvent_3` VARCHAR(50),
  `date` VARCHAR(50) NOT NULL,
  `complex` VARCHAR(255), -- Changed from INT to VARCHAR(255)
  `speed` FLOAT,
  `width` FLOAT,
  `printed_meters` FLOAT,
  `weight` FLOAT,
  `waste` FLOAT,
  `number_of_colors` INT,
  `hours` FLOAT,
  `notes` TEXT,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_printing_order_number` (`order_number`),
  INDEX `idx_printing_batch_number` (`batch_number`),
  CONSTRAINT `fk_printing_ink_1` FOREIGN KEY (`ink_1`) REFERENCES `ink` (`code_number`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_printing_ink_2` FOREIGN KEY (`ink_2`) REFERENCES `ink` (`code_number`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_printing_ink_3` FOREIGN KEY (`ink_3`) REFERENCES `ink` (`code_number`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_printing_ink_4` FOREIGN KEY (`ink_4`) REFERENCES `ink` (`code_number`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_printing_ink_5` FOREIGN KEY (`ink_5`) REFERENCES `ink` (`code_number`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_printing_ink_6` FOREIGN KEY (`ink_6`) REFERENCES `ink` (`code_number`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_printing_ink_7` FOREIGN KEY (`ink_7`) REFERENCES `ink` (`code_number`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_printing_ink_8` FOREIGN KEY (`ink_8`) REFERENCES `ink` (`code_number`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_printing_solvent_1` FOREIGN KEY (`solvent_1`) REFERENCES `solvent` (`code_number`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_printing_solvent_2` FOREIGN KEY (`solvent_2`) REFERENCES `solvent` (`code_number`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_printing_solvent_3` FOREIGN KEY (`solvent_3`) REFERENCES `solvent` (`code_number`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create warehouse_to_dispatch table
CREATE TABLE IF NOT EXISTS `warehouse_to_dispatch` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_number` VARCHAR(50) NOT NULL,
  `batch_number` VARCHAR(50) NOT NULL,
  `supplier_name` VARCHAR(255) NOT NULL,
  `item_description` VARCHAR(255) NOT NULL,
  `name_received` VARCHAR(255) NOT NULL,
  `quantity_requested` FLOAT NOT NULL,
  `quantity_sent` FLOAT NOT NULL,
  `notes` TEXT,
  `date` VARCHAR(50) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_warehouse_to_dispatch_order_number` (`order_number`),
  INDEX `idx_warehouse_to_dispatch_batch_number` (`batch_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create dispatch_to_production table
CREATE TABLE IF NOT EXISTS `dispatch_to_production` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_number` VARCHAR(50) NOT NULL,
  `date` VARCHAR(50) NOT NULL,
  `item_description` VARCHAR(255) NOT NULL,
  `uom` VARCHAR(20) NOT NULL,
  `quantity_requested` FLOAT NOT NULL,
  `quantity_sent` FLOAT NOT NULL,
  `batch_number` VARCHAR(50) NOT NULL,
  `name_received` VARCHAR(255) NOT NULL,
  `quantity_returned` FLOAT,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_dispatch_to_production_order_number` (`order_number`),
  INDEX `idx_dispatch_to_production_batch_number` (`batch_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create extruder table
CREATE TABLE IF NOT EXISTS `extruder` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_number` VARCHAR(50) NOT NULL,
  `date` VARCHAR(50) NOT NULL,
  `operator` VARCHAR(255) NOT NULL,
  `client` VARCHAR(255) NOT NULL,
  `color` VARCHAR(50) NOT NULL,
  `size` VARCHAR(50) NOT NULL,
  `thickness` FLOAT NOT NULL,
  `item_description` VARCHAR(255) NOT NULL,
  `meters` FLOAT NOT NULL,
  `weight` FLOAT NOT NULL,
  `ldpe_batch_number` VARCHAR(50),
  `enable_batch_number` VARCHAR(50),
  `exact_batch_number` VARCHAR(50),
  `white_batch_number` VARCHAR(50),
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_extruder_order_number` (`order_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create raw_slitting table
CREATE TABLE IF NOT EXISTS `raw_slitting` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_number` VARCHAR(50) NOT NULL,
  `date` VARCHAR(50) NOT NULL,
  `batch_number` VARCHAR(50) NOT NULL,
  `operator` VARCHAR(255) NOT NULL,
  `client` VARCHAR(255) NOT NULL,
  `complex` VARCHAR(255), -- Changed from INT to VARCHAR(255)
  `supplier` VARCHAR(255) NOT NULL,
  `roll_width` FLOAT NOT NULL,
  `meters` FLOAT NOT NULL,
  `weight` FLOAT NOT NULL,
  `size_after_slitting` FLOAT NOT NULL,
  `quantity` INT NOT NULL,
  `purpose` VARCHAR(255),
  `remaining_destination` VARCHAR(255),
  `waste` FLOAT,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_raw_slitting_order_number` (`order_number`),
  INDEX `idx_raw_slitting_batch_number` (`batch_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create pvc table
CREATE TABLE IF NOT EXISTS `pvc` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_number` VARCHAR(50) NOT NULL,
  `batch_number` VARCHAR(50) NOT NULL,
  `machine` VARCHAR(100) NOT NULL,
  `customer_name` VARCHAR(255) NOT NULL,
  `operator_name` VARCHAR(255) NOT NULL,
  `glue_number` VARCHAR(50),
  `notes` TEXT,
  `date` VARCHAR(50) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_pvc_order_number` (`order_number`),
  INDEX `idx_pvc_batch_number` (`batch_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create slitting table
CREATE TABLE IF NOT EXISTS `slitting` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_number` VARCHAR(50) NOT NULL,
  `batch_number` VARCHAR(50) NOT NULL,
  `machine` VARCHAR(100) NOT NULL,
  `customer_name` VARCHAR(255) NOT NULL,
  `operator_name` VARCHAR(255) NOT NULL,
  `date` VARCHAR(50) NOT NULL,
  `barcode` VARCHAR(100),
  `production` FLOAT,
  `waste` FLOAT,
  `notes` TEXT,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_slitting_order_number` (`order_number`),
  INDEX `idx_slitting_batch_number` (`batch_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create activity_log table
CREATE TABLE IF NOT EXISTS `activity_log` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_email` VARCHAR(255) NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `table_name` VARCHAR(50) NOT NULL,
  `record_id` VARCHAR(50) NOT NULL,
  `details` TEXT,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_activity_log_user_email` (`user_email`),
  INDEX `idx_activity_log_action` (`action`),
  INDEX `idx_activity_log_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create admin_settings table
CREATE TABLE IF NOT EXISTS `admin_settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` TEXT,
  `setting_description` VARCHAR(255),
  `last_updated_by` VARCHAR(255) NOT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key_unique` (`setting_key`),
  INDEX `idx_admin_settings_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;-- database/init/01-schema.sql
-- Create database if not exists
CREATE DATABASE IF NOT EXISTS order_tracking;
USE order_tracking;

-- Ensure the user has proper permissions
-- This is critical - it explicitly grants privileges to 'user'@'%'
GRANT ALL PRIVILEGES ON order_tracking.* TO 'user'@'%';
FLUSH PRIVILEGES;