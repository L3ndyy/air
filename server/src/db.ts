import mysql from 'mysql2/promise'

export type Pool = mysql.Pool

let pool: mysql.Pool | null = null

export interface DbConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
}

/** Подключение к MySQL 5 (пул соединений) */
export async function connectDb(config: DbConfig): Promise<mysql.Pool> {
  if (pool) return pool
  pool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
  })
  try {
    const conn = await pool.getConnection()
    conn.release()
    console.log('[DB] Подключено к MySQL')
  } catch (err) {
    console.error('[DB] Ошибка подключения:', err)
    throw err
  }
  return pool
}

export function getPool(): mysql.Pool | null {
  return pool
}
