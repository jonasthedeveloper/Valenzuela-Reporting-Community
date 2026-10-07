/**
 * One-command database importer.
 *   npm run db:import
 *
 * Creates the database if it does not exist, runs schema.sql, then seed.sql.
 * Pass --fresh to drop the database first.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const {
  DB_HOST = 'localhost',
  DB_PORT = '3306',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'valenzuela_crs',
} = process.env;

const readSql = (file) => fs.readFileSync(path.join(__dirname, file), 'utf8');

async function main() {
  const fresh = process.argv.includes('--fresh');
  console.log(`\n  Valenzuela CRS — database import`);
  console.log(`  host ${DB_HOST}:${DB_PORT}  user ${DB_USER}  database ${DB_NAME}\n`);

  let conn;
  try {
    conn = await mysql.createConnection({
      host: DB_HOST, port: Number(DB_PORT), user: DB_USER, password: DB_PASSWORD,
      multipleStatements: true,
    });
  } catch (err) {
    console.error('  Could not connect to MySQL. Is XAMPP running?');
    console.error(`  ${err.message}\n`);
    process.exit(1);
  }

  try {
    if (fresh) {
      await conn.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
      console.log('  dropped existing database');
    }
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.query(`USE \`${DB_NAME}\``);
    console.log('  database ready');

    await conn.query(readSql('schema.sql'));
    console.log('  schema imported   (14 tables)');

    await conn.query(readSql('seed.sql'));
    console.log('  seed data imported');

    const [[{ users }]] = await conn.query('SELECT COUNT(*) AS users FROM users');
    const [[{ reports }]] = await conn.query('SELECT COUNT(*) AS reports FROM reports');
    console.log(`\n  ${users} users, ${reports} reports\n`);
    console.log('  Test accounts');
    console.log('    admin@valenzuela.gov.ph    Admin@123');
    console.log('    staff@valenzuela.gov.ph    Staff@123');
    console.log('    resident@example.com       Resident@123\n');
  } catch (err) {
    console.error(`\n  Import failed: ${err.message}\n`);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main();
