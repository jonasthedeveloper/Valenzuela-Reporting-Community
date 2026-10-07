-- =====================================================================
-- Valenzuela Community Reporting System — schema
-- MySQL 8 / MariaDB 10.4+ (XAMPP).  Import directly in phpMyAdmin or run
--   npm run db:import
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS message_items;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS community_comments;
DROP TABLE IF EXISTS community_likes;
DROP TABLE IF EXISTS community_posts;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS lost_found_items;
DROP TABLE IF EXISTS announcement_comments;
DROP TABLE IF EXISTS announcement_likes;
DROP TABLE IF EXISTS announcements;
DROP TABLE IF EXISTS report_timeline;
DROP TABLE IF EXISTS report_media;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS report_categories;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------- users
CREATE TABLE users (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name        VARCHAR(60)  NOT NULL,
  last_name         VARCHAR(60)  NOT NULL,
  email             VARCHAR(160) NOT NULL,
  phone             VARCHAR(20)      NULL,
  password_hash     VARCHAR(255) NOT NULL,
  role              ENUM('resident','staff','admin') NOT NULL DEFAULT 'resident',
  barangay          ENUM('Ugong','Gen. T. De Leon') NOT NULL,
  address           VARCHAR(255)     NULL,
  position          VARCHAR(80)      NULL,          -- staff only
  is_active         TINYINT(1)   NOT NULL DEFAULT 1,
  two_factor_enabled TINYINT(1)  NOT NULL DEFAULT 0,
  token_version     INT UNSIGNED NOT NULL DEFAULT 0, -- bumped by "log out of all devices"
  last_login_at     DATETIME         NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at        DATETIME         NULL,
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_barangay (barangay),
  KEY idx_users_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------- refresh tokens
CREATE TABLE refresh_tokens (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  token_hash  CHAR(64)     NOT NULL,
  user_agent  VARCHAR(255)     NULL,
  expires_at  DATETIME     NOT NULL,
  revoked_at  DATETIME         NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_refresh_hash (token_hash),
  KEY idx_refresh_user (user_id),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------ password resets
CREATE TABLE password_resets (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  token_hash  CHAR(64)     NOT NULL,
  expires_at  DATETIME     NOT NULL,
  used_at     DATETIME         NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reset_hash (token_hash),
  KEY idx_reset_user (user_id),
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------- categories
CREATE TABLE report_categories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(60) NOT NULL,
  slug        VARCHAR(60) NOT NULL,
  icon        VARCHAR(40) NOT NULL DEFAULT 'flag',
  sort_order  INT         NOT NULL DEFAULT 0,
  is_active   TINYINT(1)  NOT NULL DEFAULT 1,
  UNIQUE KEY uq_category_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------- reports
CREATE TABLE reports (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference_no  VARCHAR(24)  NOT NULL,
  user_id       INT UNSIGNED NOT NULL,
  category_id   INT UNSIGNED NOT NULL,
  assigned_to   INT UNSIGNED     NULL,
  title         VARCHAR(160) NOT NULL,
  description   TEXT         NOT NULL,
  address       VARCHAR(255) NOT NULL,
  barangay      ENUM('Ugong','Gen. T. De Leon') NOT NULL,
  priority      ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  status        ENUM('pending','verified','assigned','in_progress','resolved','closed') NOT NULL DEFAULT 'pending',
  is_anonymous  TINYINT(1)   NOT NULL DEFAULT 0,
  resolution_note TEXT           NULL,
  assigned_at   DATETIME         NULL,
  resolved_at   DATETIME         NULL,
  closed_at     DATETIME         NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    DATETIME         NULL,
  UNIQUE KEY uq_report_ref (reference_no),
  KEY idx_reports_user (user_id),
  KEY idx_reports_status (status),
  KEY idx_reports_priority (priority),
  KEY idx_reports_assigned (assigned_to),
  KEY idx_reports_created (created_at),
  KEY idx_reports_deleted (deleted_at),
  CONSTRAINT fk_reports_user     FOREIGN KEY (user_id)     REFERENCES users(id)             ON DELETE CASCADE,
  CONSTRAINT fk_reports_category FOREIGN KEY (category_id) REFERENCES report_categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_reports_staff    FOREIGN KEY (assigned_to) REFERENCES users(id)             ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------- report media
CREATE TABLE report_media (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  report_id  INT UNSIGNED NOT NULL,
  file_path  VARCHAR(255) NOT NULL,
  file_name  VARCHAR(160) NOT NULL,
  mime_type  VARCHAR(80)  NOT NULL,
  file_size  INT UNSIGNED NOT NULL DEFAULT 0,
  media_type ENUM('image','video') NOT NULL DEFAULT 'image',
  kind       ENUM('evidence','resolution') NOT NULL DEFAULT 'evidence',
  uploaded_by INT UNSIGNED    NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_media_report (report_id),
  KEY idx_media_kind (kind),
  CONSTRAINT fk_media_report FOREIGN KEY (report_id)  REFERENCES reports(id) ON DELETE CASCADE,
  CONSTRAINT fk_media_user   FOREIGN KEY (uploaded_by) REFERENCES users(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------- report timeline
CREATE TABLE report_timeline (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  report_id  INT UNSIGNED NOT NULL,
  status     ENUM('pending','verified','assigned','in_progress','resolved','closed') NOT NULL,
  note       VARCHAR(500)     NULL,
  actor_id   INT UNSIGNED     NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_timeline_report (report_id),
  CONSTRAINT fk_timeline_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  CONSTRAINT fk_timeline_actor  FOREIGN KEY (actor_id)  REFERENCES users(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------- announcements
CREATE TABLE announcements (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  author_id   INT UNSIGNED     NULL,
  title       VARCHAR(180) NOT NULL,
  body        TEXT         NOT NULL,
  type        ENUM('announcement','event','advisory') NOT NULL DEFAULT 'announcement',
  status      ENUM('draft','published','scheduled') NOT NULL DEFAULT 'draft',
  barangay    ENUM('Ugong','Gen. T. De Leon') NULL,   -- NULL = both barangays  publish_at  DATETIME         NULL,
  image_path  VARCHAR(255)     NULL,      -- uploaded announcement image (/uploads/announcements/...)
  is_anonymous TINYINT(1)      NOT NULL DEFAULT 0,  -- public name shown as "Anonymous"
  created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  DATETIME         NULL,
  KEY idx_ann_status (status),
  KEY idx_ann_publish (publish_at),
  KEY idx_ann_deleted (deleted_at),
  CONSTRAINT fk_ann_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE announcement_likes (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  announcement_id INT UNSIGNED NOT NULL,
  user_id         INT UNSIGNED NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_like (announcement_id, user_id),
  CONSTRAINT fk_like_ann  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  CONSTRAINT fk_like_user FOREIGN KEY (user_id)         REFERENCES users(id)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE announcement_comments (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  announcement_id INT UNSIGNED NOT NULL,
  user_id         INT UNSIGNED NOT NULL,
  body            VARCHAR(1000) NOT NULL,
  is_anonymous    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at      DATETIME     NULL,
  KEY idx_comment_ann (announcement_id),
  CONSTRAINT fk_comment_ann  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  CONSTRAINT fk_comment_user FOREIGN KEY (user_id)         REFERENCES users(id)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------- community feed
-- Resident-driven social feed, kept separate from official announcements.
CREATE TABLE community_posts (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED NOT NULL,          -- real authenticated author (always stored)
  body         VARCHAR(2000) NOT NULL,
  image_path   VARCHAR(255)     NULL,          -- /uploads/community/...
  category     VARCHAR(40) NOT NULL DEFAULT 'general',
  is_anonymous TINYINT(1)  NOT NULL DEFAULT 0, -- public name shown as "Anonymous"
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at   DATETIME     NULL,
  KEY idx_cpost_created (created_at),
  KEY idx_cpost_deleted (deleted_at),
  CONSTRAINT fk_cpost_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE community_likes (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id    INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_clike (post_id, user_id),
  CONSTRAINT fk_clike_post FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_clike_user FOREIGN KEY (user_id) REFERENCES users(id)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One table for comments and replies: parent_id NULL = comment, set = reply.
CREATE TABLE community_comments (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id      INT UNSIGNED NOT NULL,
  user_id      INT UNSIGNED NOT NULL,          -- real authenticated author
  parent_id    INT UNSIGNED     NULL,          -- reply target (comment or reply)
  body         VARCHAR(1000) NOT NULL,
  is_anonymous TINYINT(1)  NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at   DATETIME     NULL,
  KEY idx_ccomment_post (post_id),
  KEY idx_ccomment_parent (parent_id),
  CONSTRAINT fk_ccomment_post   FOREIGN KEY (post_id)   REFERENCES community_posts(id)   ON DELETE CASCADE,
  CONSTRAINT fk_ccomment_parent FOREIGN KEY (parent_id) REFERENCES community_comments(id) ON DELETE CASCADE,
  CONSTRAINT fk_ccomment_user   FOREIGN KEY (user_id)   REFERENCES users(id)              ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------- lost & found
CREATE TABLE lost_found_items (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  type        ENUM('lost','found') NOT NULL,
  title       VARCHAR(160) NOT NULL,
  description TEXT         NOT NULL,
  item_date   DATE         NOT NULL,
  location    VARCHAR(255) NOT NULL,
  photo_path  VARCHAR(255)     NULL,
  contact     VARCHAR(120)     NULL,
  status      ENUM('open','claimed') NOT NULL DEFAULT 'open',
  claimed_by  INT UNSIGNED     NULL,
  claimed_at  DATETIME         NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  DATETIME         NULL,
  KEY idx_lf_status (status),
  KEY idx_lf_type (type),
  CONSTRAINT fk_lf_user    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_lf_claimer FOREIGN KEY (claimed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------- notifications
CREATE TABLE notifications (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  type       VARCHAR(40)  NOT NULL DEFAULT 'general',
  title      VARCHAR(160) NOT NULL,
  body       VARCHAR(500) NOT NULL,
  link       VARCHAR(255)     NULL,
  is_read    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notif_user (user_id, is_read),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------ messaging
CREATE TABLE conversations (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  subject     VARCHAR(160) NOT NULL DEFAULT 'Barangay help desk',
  last_message_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_conv_user (user_id),
  CONSTRAINT fk_conv_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE message_items (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT UNSIGNED NOT NULL,
  sender_id       INT UNSIGNED     NULL,           -- NULL = help desk assistant
  sender_type     ENUM('user','assistant') NOT NULL DEFAULT 'user',
  body            VARCHAR(2000) NOT NULL,
  is_read         TINYINT(1)   NOT NULL DEFAULT 0,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_msg_conv (conversation_id, created_at),
  CONSTRAINT fk_msg_conv   FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id)       REFERENCES users(id)         ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
