-- Migration script to safely update the tables with new complex fields

-- Start transaction
START TRANSACTION;

-- Step 1: Add the new columns to lamination table
ALTER TABLE `lamination` 
  ADD COLUMN `complex_1` VARCHAR(255) NULL DEFAULT NULL AFTER `date`,
  ADD COLUMN `complex_2` VARCHAR(255) NULL DEFAULT NULL AFTER `complex_1`,
  ADD COLUMN `complex_3` VARCHAR(255) NULL DEFAULT NULL AFTER `complex_2`,
  ADD COLUMN `complex_4` VARCHAR(255) NULL DEFAULT NULL AFTER `complex_3`,
  ADD COLUMN `complex_5` VARCHAR(255) NULL DEFAULT NULL AFTER `complex_4`,
  ADD COLUMN `complex_6` VARCHAR(255) NULL DEFAULT NULL AFTER `complex_5`;

-- Copy data from existing complex column to complex_1
UPDATE `lamination` SET `complex_1` = `complex`;

-- Step 2: Add the new columns to printing table
ALTER TABLE `printing` 
  ADD COLUMN `complex_1` VARCHAR(255) NULL DEFAULT NULL AFTER `date`,
  ADD COLUMN `complex_2` VARCHAR(255) NULL DEFAULT NULL AFTER `complex_1`,
  ADD COLUMN `complex_3` VARCHAR(255) NULL DEFAULT NULL AFTER `complex_2`,
  ADD COLUMN `complex_4` VARCHAR(255) NULL DEFAULT NULL AFTER `complex_3`,
  ADD COLUMN `complex_5` VARCHAR(255) NULL DEFAULT NULL AFTER `complex_4`,
  ADD COLUMN `complex_6` VARCHAR(255) NULL DEFAULT NULL AFTER `complex_5`;

-- Copy data from existing complex column to complex_1
UPDATE `printing` SET `complex_1` = `complex`;

-- Step 3: Add the new columns to raw_slitting table
ALTER TABLE `raw_slitting` 
  ADD COLUMN `complex_1` VARCHAR(255) NULL DEFAULT NULL AFTER `client`,
  ADD COLUMN `complex_2` VARCHAR(255) NULL DEFAULT NULL AFTER `complex_1`,
  ADD COLUMN `complex_3` VARCHAR(255) NULL DEFAULT NULL AFTER `complex_2`,
  ADD COLUMN `complex_4` VARCHAR(255) NULL DEFAULT NULL AFTER `complex_3`,
  ADD COLUMN `complex_5` VARCHAR(255) NULL DEFAULT NULL AFTER `complex_4`,
  ADD COLUMN `complex_6` VARCHAR(255) NULL DEFAULT NULL AFTER `complex_5`;

-- Copy data from existing complex column to complex_1
UPDATE `raw_slitting` SET `complex_1` = `complex`;

-- Verify data migration
SELECT COUNT(*) as lamination_mismatches FROM `lamination` WHERE `complex` IS NOT NULL AND `complex_1` != `complex`;
SELECT COUNT(*) as printing_mismatches FROM `printing` WHERE `complex` IS NOT NULL AND `complex_1` != `complex`;
SELECT COUNT(*) as raw_slitting_mismatches FROM `raw_slitting` WHERE `complex` IS NOT NULL AND `complex_1` != `complex`;

-- If all counts are 0, drop the old columns
ALTER TABLE `lamination` DROP COLUMN `complex`;
ALTER TABLE `printing` DROP COLUMN `complex`;
ALTER TABLE `raw_slitting` DROP COLUMN `complex`;

-- Commit if everything is successful
COMMIT;