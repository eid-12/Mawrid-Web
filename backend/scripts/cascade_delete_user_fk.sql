-- Cascade delete for user-related foreign keys
-- Run this if JPA schema update does not apply cascade automatically.
-- These alter the FKs to ON DELETE CASCADE so child rows are removed when a user is deleted.

-- Refresh tokens: delete all refresh tokens when user is deleted
ALTER TABLE refresh_tokens
  DROP FOREIGN KEY FK1lih5y2npsf8u5o3vhdb9y0os;

ALTER TABLE refresh_tokens
  ADD CONSTRAINT fk_refresh_tokens_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- User tokens (email verify, password reset): delete when user is deleted
-- Note: Replace FK constraint name with actual name from your schema (SHOW CREATE TABLE user_tokens;)
-- ALTER TABLE user_tokens
--   DROP FOREIGN KEY <actual_fk_name>;
-- ALTER TABLE user_tokens
--   ADD CONSTRAINT fk_user_tokens_user
--   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Borrow requests: already configured via JPA cascade
-- If needed, add ON DELETE CASCADE for borrow_requests.user_id
