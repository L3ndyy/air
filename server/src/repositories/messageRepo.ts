import type { Pool } from 'mysql2/promise'

export interface MessageRow {
  id: number
  sender_id: number
  receiver_id: number
  content: string
  is_read: number
  file_url: string | null
  file_name: string | null
  file_size: number | null
  edited_at: Date | null
  is_deleted: number
  reply_to_message_id: number | null
  reply_to_content: string | null
  reply_to_sender_id: number | null
  created_at: Date
}

/** Вставить сообщение, вернуть созданное с id */
export async function insertMessage(
  pool: Pool,
  data: {
    senderId: number | string
    receiverId: number | string
    content: string
    fileUrl?: string
    fileName?: string
    fileSize?: number
    replyToMessageId?: number | string
    replyToContent?: string
    replyToSenderId?: number | string
  }
): Promise<MessageRow> {
  const [result] = await pool.execute(
    `INSERT INTO messages (sender_id, receiver_id, content, file_url, file_name, file_size, reply_to_message_id, reply_to_content, reply_to_sender_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.senderId,
      data.receiverId,
      data.content,
      data.fileUrl ?? null,
      data.fileName ?? null,
      data.fileSize ?? null,
      data.replyToMessageId ?? null,
      (data.replyToContent ?? '').slice(0, 200) || null,
      data.replyToSenderId ?? null,
    ]
  )
  const insertId = (result as { insertId: number }).insertId
  const row = await getMessageById(pool, insertId)
  if (!row) throw new Error('Message not found after insert')
  return row
}

/** Получить сообщение по id */
export async function getMessageById(pool: Pool, id: number | string): Promise<MessageRow | null> {
  const [rows] = await pool.execute(
    'SELECT id, sender_id, receiver_id, content, is_read, file_url, file_name, file_size, edited_at, is_deleted, reply_to_message_id, reply_to_content, reply_to_sender_id, created_at FROM messages WHERE id = ?',
    [String(id)]
  )
  const list = rows as MessageRow[]
  return list.length > 0 ? list[0] : null
}

/** Сообщения между двумя пользователями (пагинация: до beforeId, limit штук, по возрастанию created_at в ответе) */
export async function getMessagesBetween(
  pool: Pool,
  userId: string | number,
  otherId: string | number,
  options: { beforeId?: string | number; limit: number }
): Promise<MessageRow[]> {
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 100)
  let sql = `
    SELECT id, sender_id, receiver_id, content, is_read, file_url, file_name, file_size, edited_at, is_deleted, reply_to_message_id, reply_to_content, reply_to_sender_id, created_at
    FROM messages
    WHERE is_deleted = 0 AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
  `
  const params: (string | number | Date)[] = [userId, otherId, otherId, userId]
  if (options.beforeId) {
    const before = await getMessageById(pool, options.beforeId)
    if (before) {
      sql += ' AND created_at < ?'
      params.push(before.created_at)
    }
  }
  sql += ' ORDER BY created_at DESC LIMIT ?'
  params.push(limit)
  const [rows] = await pool.execute(sql, params)
  return (rows as MessageRow[]).reverse()
}

/** Отметить сообщения как прочитанные (от otherId к userId) */
export async function markMessagesRead(
  pool: Pool,
  senderId: string | number,
  receiverId: string | number
): Promise<void> {
  await pool.execute(
    'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
    [senderId, receiverId]
  )
}

/** Обновить текст сообщения (редактирование) */
export async function updateMessageContent(
  pool: Pool,
  messageId: string | number,
  senderId: string | number,
  content: string
): Promise<MessageRow | null> {
  const [result] = await pool.execute(
    'UPDATE messages SET content = ?, edited_at = NOW() WHERE id = ? AND sender_id = ? AND is_deleted = 0',
    [content, messageId, senderId]
  )
  const affected = (result as { affectedRows: number }).affectedRows
  if (affected === 0) return null
  return getMessageById(pool, messageId)
}

/** Мягкое удаление сообщения */
export async function deleteMessageSoft(
  pool: Pool,
  messageId: string | number,
  senderId: string | number
): Promise<MessageRow | null> {
  const [result] = await pool.execute(
    'UPDATE messages SET is_deleted = 1, content = "" WHERE id = ? AND sender_id = ?',
    [messageId, senderId]
  )
  const affected = (result as { affectedRows: number }).affectedRows
  if (affected === 0) return null
  return getMessageById(pool, messageId)
}

/** Список чатов: для каждого собеседника последнее сообщение (без удалённых) */
export async function getChatsWithLastMessage(
  pool: Pool,
  userId: string | number
): Promise<Array<{ peerId: number; username: string; lastMessage: MessageRow }>> {
  const uid = Number(userId)
  const [rows] = await pool.execute(
    `SELECT m.id, m.sender_id, m.receiver_id, m.content, m.is_read, m.file_url, m.file_name, m.file_size, m.edited_at, m.is_deleted, m.reply_to_message_id, m.reply_to_content, m.reply_to_sender_id, m.created_at, u.username
     FROM messages m
     INNER JOIN (
       SELECT (CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END) AS peer_id, MAX(created_at) AS max_created
       FROM messages WHERE (sender_id = ? OR receiver_id = ?) AND is_deleted = 0
       GROUP BY peer_id
     ) last ON (CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END) = last.peer_id AND m.created_at = last.max_created
     INNER JOIN users u ON u.id = last.peer_id
     WHERE (m.sender_id = ? OR m.receiver_id = ?) AND m.is_deleted = 0
     ORDER BY m.created_at DESC
     LIMIT 100`,
    [uid, uid, uid, uid, uid, uid]
  )
  type Row = MessageRow & { username: string }
  const list = rows as Row[]
  return list.map((r) => ({
    peerId: r.sender_id === uid ? r.receiver_id : r.sender_id,
    username: r.username,
    lastMessage: {
      id: r.id,
      sender_id: r.sender_id,
      receiver_id: r.receiver_id,
      content: r.content,
      is_read: r.is_read,
      file_url: r.file_url,
      file_name: r.file_name,
      file_size: r.file_size,
      edited_at: r.edited_at,
      is_deleted: r.is_deleted,
      reply_to_message_id: r.reply_to_message_id,
      reply_to_content: r.reply_to_content,
      reply_to_sender_id: r.reply_to_sender_id,
      created_at: r.created_at,
    },
  }))
}
