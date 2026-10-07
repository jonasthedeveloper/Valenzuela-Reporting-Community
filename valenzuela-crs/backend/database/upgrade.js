/**
 * Additive, idempotent database upgrade.
 *
 * Applies only the NEW columns/tables on top of an existing valenzuela_crs
 * database (safe to run repeatedly — every step checks information_schema
 * first). Fresh installs can keep using `npm run db:import` (schema.sql now
 * contains all of this already).
 *
 *   npm run db:upgrade
 */
const { pool, query } = require('../config/db');

const columnExists = async (table, column) => {
  const rows = await query(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [table, column]
  );
  return rows.length > 0;
};

const tableExists = async (table) => {
  const rows = await query(
    'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [table]
  );
  return rows.length > 0;
};

const ALTERS = [
  // Official announcements: image + anonymous posting.
  ['announcements', 'image_path', "ALTER TABLE announcements ADD COLUMN image_path VARCHAR(255) NULL AFTER publish_at"],
  ['announcements', 'is_anonymous', "ALTER TABLE announcements ADD COLUMN is_anonymous TINYINT(1) NOT NULL DEFAULT 0 AFTER image_path"],
  ['announcement_comments', 'is_anonymous', "ALTER TABLE announcement_comments ADD COLUMN is_anonymous TINYINT(1) NOT NULL DEFAULT 0 AFTER body"],
];

const CREATE_TABLES = [
  `CREATE TABLE IF NOT EXISTS community_posts (
     id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
     user_id      INT UNSIGNED NOT NULL,
     body         VARCHAR(2000) NOT NULL,
     image_path   VARCHAR(255)     NULL,
     category     VARCHAR(40) NOT NULL DEFAULT 'general',
     is_anonymous TINYINT(1)  NOT NULL DEFAULT 0,
     created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     deleted_at   DATETIME     NULL,
     KEY idx_cpost_created (created_at),
     KEY idx_cpost_deleted (deleted_at),
     CONSTRAINT fk_cpost_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS community_likes (
     id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
     post_id    INT UNSIGNED NOT NULL,
     user_id    INT UNSIGNED NOT NULL,
     created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     UNIQUE KEY uq_clike (post_id, user_id),
     CONSTRAINT fk_clike_post FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
     CONSTRAINT fk_clike_user FOREIGN KEY (user_id) REFERENCES users(id)         ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS community_comments (
     id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
     post_id      INT UNSIGNED NOT NULL,
     user_id      INT UNSIGNED NOT NULL,
     parent_id    INT UNSIGNED     NULL,
     body         VARCHAR(1000) NOT NULL,
     is_anonymous TINYINT(1)  NOT NULL DEFAULT 0,
     created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     deleted_at   DATETIME     NULL,
     KEY idx_ccomment_post (post_id),
     KEY idx_ccomment_parent (parent_id),
     CONSTRAINT fk_ccomment_post   FOREIGN KEY (post_id)   REFERENCES community_posts(id)   ON DELETE CASCADE,
     CONSTRAINT fk_ccomment_parent FOREIGN KEY (parent_id) REFERENCES community_comments(id) ON DELETE CASCADE,
     CONSTRAINT fk_ccomment_user   FOREIGN KEY (user_id)   REFERENCES users(id)              ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

async function upgrade() {
  let applied = 0;

  for (const [table, column, sql] of ALTERS) {
    if (await columnExists(table, column)) {
      console.log(`• ${table}.${column} already exists`);
    } else {
      await query(sql);
      console.log(`+ ${table}.${column} added`);
      applied += 1;
    }
  }

  for (const sql of CREATE_TABLES) {
    await query(sql);
  }
  console.log('* community_posts / community_likes / community_comments ready');
  console.log(applied ? `Upgrade complete — ${applied} change(s) applied.` : 'Already up to date — no changes.');
}

upgrade()
  .then(() => pool.end())
  .catch((err) => {
    console.error('Upgrade failed:', err.message);
    process.exit(1);
  });
