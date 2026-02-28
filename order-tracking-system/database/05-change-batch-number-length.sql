-- Update cutting table
ALTER TABLE cutting MODIFY COLUMN batch_number VARCHAR(255) NOT NULL;

-- Update lamination table
ALTER TABLE lamination MODIFY COLUMN batch_number VARCHAR(255) NOT NULL;

-- Update printing table
ALTER TABLE printing MODIFY COLUMN batch_number VARCHAR(255) NOT NULL;

-- Update warehouse_to_dispatch table
ALTER TABLE warehouse_to_dispatch MODIFY COLUMN batch_number VARCHAR(255) NOT NULL;

-- Update dispatch_to_production table
ALTER TABLE dispatch_to_production MODIFY COLUMN batch_number VARCHAR(255) NOT NULL;

-- Update raw_slitting table
ALTER TABLE raw_slitting MODIFY COLUMN batch_number VARCHAR(255) NOT NULL;

-- Update pvc table
ALTER TABLE pvc MODIFY COLUMN batch_number VARCHAR(255) NOT NULL;

-- Update slitting table
ALTER TABLE slitting MODIFY COLUMN batch_number VARCHAR(255) NOT NULL;