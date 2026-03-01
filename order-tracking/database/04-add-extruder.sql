
-- Step 1: Add the new column to extruder table
ALTER TABLE `extruder` 
  ADD COLUMN `waste` VARCHAR(255) NULL DEFAULT NULL AFTER `date`;
 