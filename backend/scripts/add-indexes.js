/**
 * Migration script untuk menambahkan database indexes
 * Optimal untuk VPS 2GB RAM
 *
 * Usage: node scripts/add-indexes.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function addIndexes() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'letterdb',
  });

  try {
    console.log('🔄 Adding database indexes for performance...\n');

    const indexes = [
      {
        name: 'idx_letters_file_id',
        table: 'letters',
        columns: 'fileId',
        reason: 'Optimize JOIN in stats service',
      },
      {
        name: 'idx_edit_logs_user',
        table: 'edit_logs',
        columns: 'updatedBy',
        reason: 'Optimize input error stats query',
      },
      {
        name: 'idx_edit_logs_letter',
        table: 'edit_logs',
        columns: 'letterId',
        reason: 'Optimize edit logs lookup',
      },
    ];

    for (const idx of indexes) {
      // Cek apakah index sudah ada
      const [rows] = await connection.query(
        `SHOW INDEX FROM ${idx.table} WHERE Key_name = ?`,
        [idx.name],
      );

      if (rows.length > 0) {
        console.log(`✅ ${idx.name} already exists`);
        continue;
      }

      // Buat index
      await connection.query(
        `CREATE INDEX ${idx.name} ON ${idx.table} (${idx.columns})`,
      );
      console.log(`✅ Created ${idx.name} - ${idx.reason}`);
    }

    // Tampilkan semua index di letters table
    const [letterIndexes] = await connection.query('SHOW INDEX FROM letters');
    console.log('\n📊 Current indexes on letters table:');
    letterIndexes.forEach((idx) => {
      console.log(`   - ${idx.Key_name} (${idx.Column_name})`);
    });

    console.log('\n✨ Done! Database indexes have been added.');
  } catch (error) {
    console.error('❌ Error adding indexes:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

addIndexes();
