import 'dotenv/config';
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ngola_geasture_adm',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    console.log(`[HPP DB] Terhubung ke MySQL database: ${process.env.DB_NAME || 'ngola_geasture_adm'}`);
    connection.release();
    return true;
  } catch (error: any) {
    console.error('[HPP DB] Gagal terhubung ke basis data:', error.message);
    return false;
  }
}
