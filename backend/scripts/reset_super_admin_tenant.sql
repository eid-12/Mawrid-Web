-- Reset Super Admin tenant to NULL for system-wide access
-- Run this to allow SUPER_ADMIN users to have full system scope instead of a single college.

UPDATE users SET tenant_id = NULL WHERE role = 'SUPER_ADMIN';
