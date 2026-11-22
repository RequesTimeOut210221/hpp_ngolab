const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runMigration() {
  const sqlFile = path.join(__dirname, '..', 'database', '008_hpp_and_finance_integration.sql');
  console.log(`[Migration] Membaca file SQL: ${sqlFile}`);
  const sql = fs.readFileSync(sqlFile, 'utf8');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ngola_geasture_adm',
    multipleStatements: true
  });

  console.log(`[Migration] Terhubung ke MySQL ${process.env.DB_NAME || 'ngola_geasture_adm'}...`);
  try {
    console.log('[Migration] Menjalankan query migrasi dan seeding skema HPP...');
    await connection.query(sql);
    console.log('[Migration] SUKSES! Seluruh tabel dan seeding data HPP berhasil dieksekusi.');

    // Validasi jumlah data
    const [ingRows] = await connection.query('SELECT COUNT(*) as count FROM hpp_master_ingredients');
    const [recRows] = await connection.query('SELECT COUNT(*) as count FROM hpp_recipes');
    const [bomRows] = await connection.query('SELECT COUNT(*) as count FROM hpp_recipe_ingredients');
    const [cfRows] = await connection.query('SELECT COUNT(*) as count FROM hpp_cashflow');

    console.log('\n--- RINGKASAN VERIFIKASI DATA FASE 2 ---');
    console.log(`✓ hpp_master_ingredients : ${ingRows[0].count} item`);
    console.log(`✓ hpp_recipes            : ${recRows[0].count} resep`);
    console.log(`✓ hpp_recipe_ingredients : ${bomRows[0].count} komposisi bahan`);
    console.log(`✓ hpp_cashflow           : ${cfRows[0].count} transaksi kas`);
    console.log('✓ hpp_price_sync_logs    : Siap mencatat audit log POS');
    console.log('----------------------------------------\n');
  } catch (error) {
    console.error('[Migration ERROR]:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
