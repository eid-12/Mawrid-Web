
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `action_type` varchar(64) DEFAULT NULL,
  `actor_name` varchar(255) DEFAULT NULL,
  `actor_role` varchar(255) DEFAULT NULL,
  `admin_id` bigint DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `message` text NOT NULL,
  `status` varchar(32) DEFAULT NULL,
  `tenant_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKrlumg8rybq5pvccry54dra8a2` (`tenant_id`),
  CONSTRAINT `FKrlumg8rybq5pvccry54dra8a2` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `borrow_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `borrow_requests` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `decided_at` datetime(6) DEFAULT NULL,
  `decided_by_admin_id` bigint DEFAULT NULL,
  `decision_reason` text,
  `end_date` date NOT NULL,
  `request_note` text,
  `start_date` date NOT NULL,
  `status` varchar(255) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `equipment_id` bigint NOT NULL,
  `equipment_unit_id` bigint DEFAULT NULL,
  `tenant_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK2kl8amuwp8109dg2306fgm2ek` (`equipment_id`),
  KEY `FK2w2k1o1rt8hphj5h1qyd17t6t` (`equipment_unit_id`),
  KEY `FKpub3lsg76vfng9yptk6qfr8pf` (`tenant_id`),
  KEY `FKhw6n6naouqvpx1r0lbo211fu6` (`user_id`),
  CONSTRAINT `FK2kl8amuwp8109dg2306fgm2ek` FOREIGN KEY (`equipment_id`) REFERENCES `equipment` (`id`),
  CONSTRAINT `FK2w2k1o1rt8hphj5h1qyd17t6t` FOREIGN KEY (`equipment_unit_id`) REFERENCES `equipment_units` (`id`),
  CONSTRAINT `FKhw6n6naouqvpx1r0lbo211fu6` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKpub3lsg76vfng9yptk6qfr8pf` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `check_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `check_transactions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `action` varchar(255) NOT NULL,
  `action_at` datetime(6) NOT NULL,
  `admin_id` bigint DEFAULT NULL,
  `notes` text,
  `equipment_unit_id` bigint NOT NULL,
  `request_id` bigint NOT NULL,
  `tenant_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK3y9sb77i5v2qr8j40brdfteo3` (`equipment_unit_id`),
  KEY `FKgqui2o5fy58i4nkcr1mlrjsuf` (`request_id`),
  KEY `FKbe9d2af86amvonfim3c2o5rdt` (`tenant_id`),
  CONSTRAINT `FK3y9sb77i5v2qr8j40brdfteo3` FOREIGN KEY (`equipment_unit_id`) REFERENCES `equipment_units` (`id`),
  CONSTRAINT `FKbe9d2af86amvonfim3c2o5rdt` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  CONSTRAINT `FKgqui2o5fy58i4nkcr1mlrjsuf` FOREIGN KEY (`request_id`) REFERENCES `borrow_requests` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `dismissed_dashboard_alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dismissed_dashboard_alerts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `alert_key` varchar(255) NOT NULL,
  `dismissed_at` datetime(6) NOT NULL,
  `tenant_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dismissed_alert_tenant_key` (`tenant_id`,`alert_key`),
  CONSTRAINT `FK14ga79o6b1qdax7atmaqbmrv1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `equipment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `equipment` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `available_from` date NOT NULL,
  `available_quantity` int NOT NULL,
  `available_to` date NOT NULL,
  `category` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `created_by_admin_id` bigint DEFAULT NULL,
  `description` text,
  `max_borrow_days` int DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `total_quantity` int NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `tenant_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKija94fgeoy1o302sm2vlotmuo` (`tenant_id`),
  CONSTRAINT `FKija94fgeoy1o302sm2vlotmuo` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `equipment_units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `equipment_units` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `asset_tag` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `notes` text,
  `serial_no` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL,
  `unit_condition` varchar(255) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `equipment_id` bigint NOT NULL,
  `tenant_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKc9cunqj65covf5haeqcf5j50n` (`equipment_id`),
  KEY `FKpgcww6bdmohomxp8gsea1gm14` (`tenant_id`),
  CONSTRAINT `FKc9cunqj65covf5haeqcf5j50n` FOREIGN KEY (`equipment_id`) REFERENCES `equipment` (`id`),
  CONSTRAINT `FKpgcww6bdmohomxp8gsea1gm14` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=151 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `refresh_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refresh_tokens` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_ip` varchar(45) DEFAULT NULL,
  `expires_at` datetime(6) NOT NULL,
  `issued_at` datetime(6) NOT NULL,
  `remember_me` bit(1) DEFAULT NULL,
  `revoked_at` datetime(6) DEFAULT NULL,
  `token_hash` varchar(64) NOT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `replaced_by_token_id` bigint DEFAULT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_refresh_tokens_hash` (`token_hash`),
  KEY `idx_refresh_tokens_user_exp` (`user_id`,`expires_at`),
  KEY `idx_refresh_tokens_user_revoked` (`user_id`,`revoked_at`),
  KEY `FKamgp9t072mcq25aekiqd53o72` (`replaced_by_token_id`),
  CONSTRAINT `FK1lih5y2npsf8u5o3vhdb9y0os` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKamgp9t072mcq25aekiqd53o72` FOREIGN KEY (`replaced_by_token_id`) REFERENCES `refresh_tokens` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tenant_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tenant_settings` (
  `tenant_id` bigint NOT NULL,
  `approval_required` bit(1) DEFAULT NULL,
  `cutoff_time` time(6) DEFAULT NULL,
  `max_borrow_days` int DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`tenant_id`),
  CONSTRAINT `FKiakkc7wc7l3i5h65ekd6tlb4n` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tenants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tenants` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(255) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL,
  `website` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_aye4nalvpsbxpjq0vt2ulaiqi` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_tokens` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `token_type` varchar(32) NOT NULL,
  `used_at` datetime(6) DEFAULT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_tokens_type_hash` (`token_type`,`token_hash`),
  KEY `idx_user_tokens_user_type_exp` (`user_id`,`token_type`,`expires_at`),
  CONSTRAINT `FK61iiu6gfevpvo2v3yl76sar7r` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified` tinyint(1) NOT NULL,
  `email_verified_at` datetime(6) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL,
  `last_active_at` datetime(6) DEFAULT NULL,
  `last_sent_at` datetime(6) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `password_changed_at` datetime(6) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `role` enum('USER','ADMIN','SUPER_ADMIN') NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `tenant_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_6dotkott2kjsp8vw4d0m25fb7` (`email`),
  KEY `FK21hn1a5ja1tve7ae02fnn4cld` (`tenant_id`),
  CONSTRAINT `FK21hn1a5ja1tve7ae02fnn4cld` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=112 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

