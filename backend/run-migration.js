const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration(migrationFile) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'caloria_db',
    multipleStatements: true
  });

  try {
    console.log(`📦 Running migration: ${migrationFile}`);
    
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations', migrationFile),
      'utf8'
    );
    
    await connection.query(sql);
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('⚠️  Column already exists, skipping...');
    } else {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  } finally {
    await connection.end();
  }
}

// Get migration file from command line
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.log('Usage: node run-migration.js <migration-file.sql>');
  console.log('Example: node run-migration.js add_admin_column.sql');
  process.exit(1);
}

runMigration(migrationFile);
