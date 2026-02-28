USE order_tracking;

-- Insert roles
INSERT INTO `roles` (`id`, `role`) VALUES
(1, 'admin'),
(2, 'operation')
ON DUPLICATE KEY UPDATE `role` = VALUES(`role`);

-- Insert admin user (password: m!l3D1234)
INSERT INTO `users` (`email`, `password`, `full_name`, `id_role`, `is_approved`, `is_active`) VALUES
('miled@vacuumbags.com.lb', '$2a$12$dJLPVVeYfn/ZSKYViKsZ1eAkKpBBu2G03RyivdEmuNr2Fvm7uw2ji', 'Miled Nakouzi', 1, 1, 1)
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`), `id_role` = VALUES(`id_role`);

/*-- Insert complex values
INSERT INTO `complex` (`id`, `desc`) VALUES
(1, 'PET 12'),
(2, 'PETMET 12'),
(3, 'PET MATT 12'),
(4, 'PET 12 SUPER-MATT'),
(5, 'PET 19'),
(6, 'BOPP 15'),
(7, 'BOPP MATT 15'),
(8, 'BOPP 18'),
(9, 'MET18'),
(10, 'BOPP 20'),
(11, 'MET 20'),
(12, 'CMET 20'),
(13, 'BOPP MATT 20'),
(14, 'PER 20'),
(15, 'BOPP 30'),
(16, 'MET 30'),
(17, 'CMET 30'),
(18, 'PPANITFOG 30'),
(19, 'CPP 30'),
(20, 'PER 30'),
(21, 'BOPP 35'),
(22, 'PER 35'),
(23, 'PP LABEL 38'),
(24, 'PVDC 14'),
(25, 'CPA 20'),
(26, 'CPA 80'),
(27, 'PVC 40 CHINA'),
(28, 'PVC 50 CHINA'),
(29, 'PET SHRINK 45'),
(30, 'PE 50'),
(31, 'PE 60'),
(32, 'PE 60 EASYPEAL'),
(33, 'PE 70'),
(34, 'PE 80'),
(35, 'PE 90'),
(36, 'PE 100'),
(37, 'PE110'),
(38, 'PE 120'),
(39, 'ALU 9'),
(40, 'ALUPET 12'),
(41, 'PE 112'),
(42, 'PET 9')
ON DUPLICATE KEY UPDATE `desc` = VALUES(`desc`);

-- Insert sample ink data
INSERT INTO `ink` (`code_number`, `supplier`, `color`, `code`, `pal_number`, `date`, `is_finished`) VALUES
('INK001', 'SupplierA', 'Red', 'R001', 'PAL123', NOW(), 0),
('INK002', 'SupplierA', 'Blue', 'B001', 'PAL124', NOW(), 0),
('INK003', 'SupplierB', 'Green', 'G001', 'PAL125', NOW(), 0),
('INK004', 'SupplierB', 'Yellow', 'Y001', 'PAL126', NOW(), 0),
('INK005', 'SupplierC', 'Black', 'BL001', 'PAL127', NOW(), 0),
('INK006', 'SupplierC', 'White', 'W001', 'PAL128', NOW(), 0)
ON DUPLICATE KEY UPDATE 
  `supplier` = VALUES(`supplier`),
  `color` = VALUES(`color`),
  `code` = VALUES(`code`);

-- Insert sample solvent data
INSERT INTO `solvent` (`code_number`, `supplier`, `product`, `code`, `pal_number`, `date`, `is_finished`) VALUES
('SOL001', 'SupplierA', 'Ethanol', 'E001', 'PAL223', NOW(), 0),
('SOL002', 'SupplierA', 'Acetone', 'A001', 'PAL224', NOW(), 0),
('SOL003', 'SupplierB', 'MEK', 'M001', 'PAL225', NOW(), 0),
('SOL004', 'SupplierC', 'Toluene', 'T001', 'PAL226', NOW(), 0)
ON DUPLICATE KEY UPDATE 
  `supplier` = VALUES(`supplier`),
  `product` = VALUES(`product`),
  `code` = VALUES(`code`);

-- Insert default admin settings
INSERT INTO `admin_settings` (`setting_key`, `setting_value`, `setting_description`, `last_updated_by`, `updated_at`) VALUES
('order-tracking-fields', '{"cutting":["order_number","batch_number","customer_name","date","quantity","waste"],"lamination":["order_number","batch_number","customer_name","date","complex","meters","weight","waste"],"printing":["order_number","batch_number","customer_name","date","complex","printed_meters","weight","waste"],"warehouseToDispatch":["order_number","batch_number","supplier_name","item_description","quantity_requested","quantity_sent"],"dispatchToProduction":["order_number","batch_number","item_description","quantity_requested","quantity_sent","quantity_returned"],"extruder":["order_number","client","date","item_description","meters","weight"],"rawSlitting":["order_number","batch_number","client","date","complex","meters","weight","waste"],"pvc":["order_number","batch_number","customer_name","date"],"slitting":["order_number","batch_number","customer_name","date","production","waste"]}', 'Order tracking display fields configuration', 'miled@vacuumbags.com.lb', NOW()),
('system_initialized', 'true', 'Indicates if the system has been initialized', 'miled@vacuumbags.com.lb', NOW())
ON DUPLICATE KEY UPDATE 
  `setting_value` = VALUES(`setting_value`),
  `setting_description` = VALUES(`setting_description`);

-- Insert sample data for all tables (optional for testing)
-- Commented out to avoid adding unnecessary test data in production


-- Sample cutting data
INSERT INTO `cutting` (`order_number`, `batch_number`, `machine`, `customer_name`, `operator_name`, `date`, `speed`, `uom`, `quantity`, `waste`) VALUES
('ORD-2023-001', 'BATCH-23-001', 'Machine A', 'Customer 1', 'Operator 1', NOW(), 10.5, 'units', 100, 2),
('ORD-2023-002', 'BATCH-23-002', 'Machine B', 'Customer 2', 'Operator 2', NOW(), 12.0, 'units', 150, 3);

-- Sample lamination data with new complex fields
INSERT INTO `lamination` (`order_number`, `batch_number`, `machine`, `customer_name`, `operator_name`, `date`, `complex_1`, `complex_2`, `complex_3`, `meters`, `weight`, `waste`) VALUES
('ORD-2023-001', 'BATCH-23-003', 'Machine C', 'Customer 1', 'Operator 3', NOW(), 'PET 12', 'BOPP 15', 'ALU 9', 200, 50, 5),
('ORD-2023-003', 'BATCH-23-004', 'Machine D', 'Customer 3', 'Operator 4', NOW(), 'BOPP 18', 'PE 50', NULL, 300, 75, 8);

-- Sample printing data with new complex fields
INSERT INTO `printing` (`order_number`, `batch_number`, `machine`, `customer_name`, `operator_name`, `date`, `ink_1`, `ink_2`, `complex_1`, `complex_2`, `printed_meters`, `weight`, `waste`) VALUES
('ORD-2023-001', 'BATCH-23-005', 'Machine E', 'Customer 1', 'Operator 5', NOW(), 'INK001', 'INK002', 'PET 12', 'BOPP 20', 400, 100, 10),
('ORD-2023-004', 'BATCH-23-006', 'Machine F', 'Customer 4', 'Operator 6', NOW(), 'INK003', 'INK004', 'BOPP 18', 'PE 80', 500, 125, 15);

-- Sample raw_slitting data with new complex fields
INSERT INTO `raw_slitting` (`order_number`, `batch_number`, `operator`, `client`, `date`, `complex_1`, `complex_2`, `supplier`, `roll_width`, `meters`, `weight`, `size_after_slitting`, `quantity`, `waste`)
VALUES 
('ORD-2023-005', 'BATCH-23-007', 'Operator 7', 'Customer 5', NOW(), 'BOPP 30', 'PE 60', 'Supplier A', 1200, 1500, 300, 600, 2, 15),
('ORD-2023-006', 'BATCH-23-008', 'Operator 8', 'Customer 6', NOW(), 'PET 12', 'ALU 9', 'Supplier B', 1000, 2000, 350, 500, 4, 20);
*/