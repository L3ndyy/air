import type { Pool } from 'mysql2/promise'
import bcrypt from 'bcrypt'

export interface UserRow {
  id: number
  username: string
  password_hash: string
  created_at: Date
}

/** Найти пользователя по id */
export async function findUserById(pool: Pool, id: number | string): Promise<UserRow | null> {
  const [rows] = await pool.execute('SELECT id, username, password_hash, created_at FROM users WHERE id = ?', [String(id)])
  const list = rows as UserRow[]
  return list.length > 0 ? list[0] : null
}

/** Найти пользователя по username */
export async function findUserByUsername(pool: Pool, username: string): Promise<UserRow | null> {
  const [rows] = await pool.execute('SELECT id, username, password_hash, created_at FROM users WHERE username = ?', [username])
  const list = rows as UserRow[]
  return list.length > 0 ? list[0] : null
}

/** Создать пользователя (пароль хешируется) */
export async function createUser(pool: Pool, username: string, plainPassword: string): Promise<UserRow> {
  const passwordHash = await bcrypt.hash(plainPassword, 10)
  const [result] = await pool.execute(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)',
    [username, passwordHash]
  )
  const insertId = (result as { insertId: number }).insertId
  const row = await findUserById(pool, insertId)
  if (!row) throw new Error('User not found after insert')
  return row
}

/** Проверка пароля */
export async function checkPassword(user: UserRow, plainPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, user.password_hash)
}
