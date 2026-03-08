import jwt from 'jsonwebtoken'
import { Server, Socket } from 'socket.io'
import { getPool } from '../db.js'
import * as userRepo from '../repositories/userRepo.js'
import type { MessageRow } from '../repositories/messageRepo.js'
import * as messageRepo from '../repositories/messageRepo.js'

const JWT_SECRET = process.env.JWT_SECRET || 'air-dev-secret'
const MAX_MESSAGE_LENGTH = 10000
const RATE_LIMIT_MESSAGES = 60
const RATE_LIMIT_WINDOW_MS = 60_000

function sanitizeContent(text: string): string {
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .trim()
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
function checkRateLimit(socketId: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  let entry = rateLimitMap.get(socketId)
  if (!entry) {
    rateLimitMap.set(socketId, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs }
    rateLimitMap.set(socketId, entry)
    return true
  }
  entry.count++
  return entry.count <= limit
}

export interface UserPayload {
  _id: string
  username: string
}

export interface MessagePayload {
  _id: string
  senderId: string
  receiverId: string
  content: string
  read: boolean
  createdAt: string
  editedAt?: string
  isDeleted?: boolean
  replyToMessageId?: string
  replyToContent?: string
  replyToSenderId?: string
  fileUrl?: string
  fileName?: string
  fileSize?: number
}

const socketToUserId = new Map<string, string>()
const userIdToSocketId = new Map<string, string>()

function toUserPayload(user: { id: number; username: string }): UserPayload {
  return { _id: String(user.id), username: user.username }
}

function rowToMessagePayload(row: MessageRow): MessagePayload {
  return {
    _id: String(row.id),
    senderId: String(row.sender_id),
    receiverId: String(row.receiver_id),
    content: row.content ?? '',
    read: Boolean(row.is_read),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
    ...(row.edited_at ? { editedAt: new Date(row.edited_at).toISOString() } : {}),
    ...(row.is_deleted ? { isDeleted: true } : {}),
    ...(row.reply_to_message_id != null ? { replyToMessageId: String(row.reply_to_message_id) } : {}),
    ...(row.reply_to_content != null ? { replyToContent: row.reply_to_content } : {}),
    ...(row.reply_to_sender_id != null ? { replyToSenderId: String(row.reply_to_sender_id) } : {}),
    ...(row.file_url ? { fileUrl: row.file_url } : {}),
    ...(row.file_name ? { fileName: row.file_name } : {}),
    ...(row.file_size != null ? { fileSize: row.file_size } : {}),
  }
}

export async function handleRegister(io: Server, socket: Socket, data: { username: string; password: string }, ack: (res: { ok: boolean; user?: UserPayload; token?: string; error?: string }) => void) {
  const pool = getPool()
  if (!pool) return ack({ ok: false, error: 'БД недоступна' })
  const { username, password } = data ?? {}
  const u = username?.trim()
  const p = password?.trim()
  if (!u || !p) {
    ack({ ok: false, error: 'Нужны username и пароль' })
    return
  }
  if (u.length < 3 || u.length > 32) {
    ack({ ok: false, error: 'Имя пользователя от 3 до 32 символов' })
    return
  }
  if (p.length < 4) {
    ack({ ok: false, error: 'Пароль минимум 4 символа' })
    return
  }
  try {
    const existing = await userRepo.findUserByUsername(pool, u)
    if (existing) {
      ack({ ok: false, error: 'Такой пользователь уже есть' })
      return
    }
    const user = await userRepo.createUser(pool, u, p)
    const userId = String(user.id)
    socketToUserId.set(socket.id, userId)
    userIdToSocketId.set(userId, socket.id)
    io.emit('user_online', { userId })
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
    ack({ ok: true, user: toUserPayload(user), token })
  } catch (err) {
    console.error('[socket] register error', err)
    ack({ ok: false, error: 'Ошибка регистрации' })
  }
}

export async function handleLogin(io: Server, socket: Socket, data: { username: string; password: string }, ack: (res: { ok: boolean; user?: UserPayload; token?: string; error?: string }) => void) {
  const pool = getPool()
  if (!pool) return ack({ ok: false, error: 'БД недоступна' })
  const { username, password } = data ?? {}
  if (!username?.trim() || !password?.trim()) {
    ack({ ok: false, error: 'Нужны username и пароль' })
    return
  }
  try {
    const user = await userRepo.findUserByUsername(pool, username.trim())
    if (!user || !(await userRepo.checkPassword(user, password))) {
      ack({ ok: false, error: 'Неверный логин или пароль' })
      return
    }
    const userId = String(user.id)
    socketToUserId.set(socket.id, userId)
    userIdToSocketId.set(userId, socket.id)
    io.emit('user_online', { userId })
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
    ack({ ok: true, user: toUserPayload(user), token })
  } catch (err) {
    console.error('[socket] login error', err)
    ack({ ok: false, error: 'Ошибка входа' })
  }
}

export async function handleRestoreSession(io: Server, socket: Socket, data: { token: string }, ack: (res: { ok: boolean; error?: string }) => void) {
  const pool = getPool()
  if (!pool) return ack({ ok: false, error: 'БД недоступна' })
  const token = data?.token
  if (!token) {
    ack({ ok: false, error: 'Нет токена' })
    return
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    const userId = decoded.userId
    const existing = await userRepo.findUserById(pool, userId)
    if (!existing) {
      ack({ ok: false, error: 'Пользователь не найден' })
      return
    }
    socketToUserId.set(socket.id, userId)
    userIdToSocketId.set(userId, socket.id)
    io.emit('user_online', { userId })
    ack({ ok: true })
  } catch {
    ack({ ok: false, error: 'Сессия истекла' })
  }
}

export function handleSendMessage(
  io: Server,
  socket: Socket,
  data: {
    receiverId: string
    content?: string
    fileUrl?: string
    fileName?: string
    fileSize?: number
    replyToMessageId?: string
    replyToContent?: string
    replyToSenderId?: string
  },
  ack: (res: { ok: boolean; message?: MessagePayload; error?: string }) => void
) {
  const pool = getPool()
  if (!pool) return ack({ ok: false, error: 'БД недоступна' })
  const senderId = socketToUserId.get(socket.id)
  if (!senderId) {
    ack({ ok: false, error: 'Сначала войдите' })
    return
  }
  if (!checkRateLimit(socket.id, RATE_LIMIT_MESSAGES, RATE_LIMIT_WINDOW_MS)) {
    ack({ ok: false, error: 'Слишком много сообщений. Подождите минуту.' })
    return
  }
  const { receiverId, content, fileUrl, fileName, fileSize, replyToMessageId, replyToContent, replyToSenderId } = data ?? {}
  if (!receiverId?.trim()) {
    ack({ ok: false, error: 'Нужен receiverId' })
    return
  }
  const raw = typeof content === 'string' ? content : ''
  const sanitized = sanitizeContent(raw).slice(0, MAX_MESSAGE_LENGTH)
  const hasFile = fileUrl?.trim() && fileName?.trim()
  if (!sanitized && !hasFile) {
    ack({ ok: false, error: 'Нужен текст или файл' })
    return
  }
  messageRepo
    .insertMessage(pool, {
      senderId,
      receiverId: receiverId.trim(),
      content: sanitized || (fileName ?? ''),
      fileUrl: fileUrl?.trim(),
      fileName: fileName?.trim(),
      fileSize: fileSize != null ? Number(fileSize) : undefined,
      replyToMessageId: replyToMessageId?.trim(),
      replyToContent: replyToContent != null ? String(replyToContent).slice(0, 200) : undefined,
      replyToSenderId: replyToSenderId?.trim(),
    })
    .then((row) => {
      const payload = rowToMessagePayload(row)
      ack({ ok: true, message: payload })
      const receiverSocketId = userIdToSocketId.get(receiverId)
      if (receiverSocketId) io.to(receiverSocketId).emit('new_message', payload)
    })
    .catch((err) => {
      console.error('[socket] send_message error', err)
      ack({ ok: false, error: 'Не удалось отправить' })
    })
}

export function handleEditMessage(
  io: Server,
  socket: Socket,
  data: { messageId: string; content: string },
  ack: (res: { ok: boolean; message?: MessagePayload; error?: string }) => void
) {
  const pool = getPool()
  if (!pool) return ack({ ok: false, error: 'БД недоступна' })
  const userId = socketToUserId.get(socket.id)
  if (!userId) {
    ack({ ok: false, error: 'Сначала войдите' })
    return
  }
  const { messageId, content } = data ?? {}
  if (!messageId?.trim()) {
    ack({ ok: false, error: 'Нужен messageId' })
    return
  }
  const raw = typeof content === 'string' ? content : ''
  const sanitized = sanitizeContent(raw).slice(0, MAX_MESSAGE_LENGTH)
  if (!sanitized) {
    ack({ ok: false, error: 'Текст не может быть пустым' })
    return
  }
  messageRepo
    .updateMessageContent(pool, messageId, userId, sanitized)
    .then((row) => {
      if (!row) {
        ack({ ok: false, error: 'Сообщение не найдено' })
        return
      }
      const payload = rowToMessagePayload(row)
      ack({ ok: true, message: payload })
      const otherId = String(row.sender_id) === userId ? String(row.receiver_id) : String(row.sender_id)
      const receiverSocketId = userIdToSocketId.get(otherId)
      if (receiverSocketId) io.to(receiverSocketId).emit('message_updated', payload)
    })
    .catch((err) => {
      console.error('[socket] edit_message error', err)
      ack({ ok: false, error: 'Ошибка' })
    })
}

export function handleDeleteMessage(
  io: Server,
  socket: Socket,
  data: { messageId: string },
  ack: (res: { ok: boolean; error?: string }) => void
) {
  const pool = getPool()
  if (!pool) return ack({ ok: false, error: 'БД недоступна' })
  const userId = socketToUserId.get(socket.id)
  if (!userId) {
    ack({ ok: false, error: 'Сначала войдите' })
    return
  }
  const messageId = data?.messageId?.trim()
  if (!messageId) {
    ack({ ok: false, error: 'Нужен messageId' })
    return
  }
  messageRepo
    .deleteMessageSoft(pool, messageId, userId)
    .then((row) => {
      if (!row) {
        ack({ ok: false, error: 'Сообщение не найдено' })
        return
      }
      ack({ ok: true })
      const otherId = String(row.sender_id) === userId ? String(row.receiver_id) : String(row.sender_id)
      const receiverSocketId = userIdToSocketId.get(otherId)
      if (receiverSocketId) io.to(receiverSocketId).emit('message_deleted', { messageId })
      const senderSocketId = userIdToSocketId.get(userId)
      if (senderSocketId) io.to(senderSocketId).emit('message_deleted', { messageId })
    })
    .catch((err) => {
      console.error('[socket] delete_message error', err)
      ack({ ok: false, error: 'Ошибка' })
    })
}

const DEFAULT_MESSAGE_LIMIT = 50

export function handleGetMessages(socket: Socket, data: { otherUserId: string; beforeId?: string; limit?: number }, ack: (res: { ok: boolean; messages?: MessagePayload[]; error?: string }) => void) {
  const pool = getPool()
  if (!pool) return ack({ ok: false, error: 'БД недоступна' })
  const userId = socketToUserId.get(socket.id)
  if (!userId) {
    ack({ ok: false, error: 'Сначала войдите' })
    return
  }
  const otherId = data?.otherUserId?.trim()
  if (!otherId) {
    ack({ ok: false, error: 'Нужен otherUserId' })
    return
  }
  const limit = Math.min(Math.max(Number(data?.limit) || DEFAULT_MESSAGE_LIMIT, 1), 100)
  messageRepo
    .getMessagesBetween(pool, userId, otherId, { beforeId: data?.beforeId, limit })
    .then((rows) => {
      ack({ ok: true, messages: rows.map(rowToMessagePayload) })
    })
    .catch((err) => {
      console.error('[socket] get_messages error', err)
      ack({ ok: false, error: 'Ошибка загрузки' })
    })
}

export function handleGetChats(socket: Socket, _data: unknown, ack: (res: { ok: boolean; chats?: Array<{ user: UserPayload; lastMessage?: MessagePayload; online?: boolean }>; error?: string }) => void) {
  const pool = getPool()
  if (!pool) return ack({ ok: false, error: 'БД недоступна' })
  const userId = socketToUserId.get(socket.id)
  if (!userId) {
    ack({ ok: false, error: 'Сначала войдите' })
    return
  }
  messageRepo
    .getChatsWithLastMessage(pool, userId)
    .then((chats) => {
      const result = chats.map((c) => ({
        user: { _id: String(c.peerId), username: c.username },
        lastMessage: rowToMessagePayload(c.lastMessage),
        online: userIdToSocketId.has(String(c.peerId)),
      }))
      ack({ ok: true, chats: result })
    })
    .catch((err) => {
      console.error('[socket] get_chats error', err)
      ack({ ok: false, error: 'Ошибка загрузки чатов' })
    })
}

export function handleMessagesRead(io: Server, socket: Socket, data: { otherUserId: string }, ack: (res: { ok: boolean; error?: string }) => void) {
  const pool = getPool()
  if (!pool) return ack({ ok: false, error: 'БД недоступна' })
  const readerId = socketToUserId.get(socket.id)
  if (!readerId) {
    ack({ ok: false, error: 'Сначала войдите' })
    return
  }
  const otherId = data?.otherUserId?.trim()
  if (!otherId) {
    ack({ ok: false, error: 'Нужен otherUserId' })
    return
  }
  messageRepo
    .markMessagesRead(pool, otherId, readerId)
    .then(() => {
      ack({ ok: true })
      const senderSocketId = userIdToSocketId.get(otherId)
      if (senderSocketId) io.to(senderSocketId).emit('messages_read', { readerId })
    })
    .catch((err) => {
      console.error('[socket] messages_read error', err)
      ack({ ok: false, error: 'Ошибка' })
    })
}

export function handleTyping(io: Server, socket: Socket, data: { otherUserId: string; isTyping: boolean }) {
  const userId = socketToUserId.get(socket.id)
  if (!userId) return
  const otherSocketId = data?.otherUserId ? userIdToSocketId.get(data.otherUserId) : null
  if (otherSocketId) io.to(otherSocketId).emit('user_typing', { userId, isTyping: !!data?.isTyping })
}

export function handleGetUserId(socket: Socket, data: { username: string }, ack: (res: { ok: boolean; userId?: string; username?: string; error?: string }) => void) {
  const pool = getPool()
  if (!pool) return ack({ ok: false, error: 'БД недоступна' })
  const username = data?.username?.trim()
  if (!username) {
    ack({ ok: false, error: 'Нужен username' })
    return
  }
  userRepo
    .findUserByUsername(pool, username)
    .then((u) => {
      if (!u) {
        ack({ ok: false, error: 'Пользователь не найден' })
        return
      }
      ack({ ok: true, userId: String(u.id), username: u.username })
    })
    .catch((err) => {
      console.error('[socket] get_user_id error', err)
      ack({ ok: false, error: 'Ошибка' })
    })
}

export function onDisconnect(io: Server, socket: Socket) {
  const userId = socketToUserId.get(socket.id)
  if (userId) {
    userIdToSocketId.delete(userId)
    io.emit('user_offline', { userId })
  }
  socketToUserId.delete(socket.id)
}

export function getUserId(socket: Socket): string | undefined {
  return socketToUserId.get(socket.id)
}
