import { Server } from 'socket.io'
import {
  handleRegister,
  handleLogin,
  handleRestoreSession,
  handleSendMessage,
  handleEditMessage,
  handleDeleteMessage,
  handleGetMessages,
  handleGetChats,
  handleGetUserId,
  handleMessagesRead,
  handleTyping,
  onDisconnect,
} from './handlers.js'

export function setupSocket(io: Server): void {
  io.on('connection', (socket) => {
    socket.on('register', (data: { username: string; password: string }, ack: (r: unknown) => void) => {
      handleRegister(io, socket, data, ack as Parameters<typeof handleRegister>[3])
    })

    socket.on('login', (data: { username: string; password: string }, ack: (r: unknown) => void) => {
      handleLogin(io, socket, data, ack as Parameters<typeof handleLogin>[3])
    })

    socket.on('restore_session', (data: { token: string }, ack: (r: unknown) => void) => {
      handleRestoreSession(io, socket, data, ack as Parameters<typeof handleRestoreSession>[3])
    })

    socket.on(
      'send_message',
      (data: { receiverId: string; content?: string; fileUrl?: string; fileName?: string; fileSize?: number; replyToMessageId?: string; replyToContent?: string; replyToSenderId?: string }, ack: (r: unknown) => void) => {
        handleSendMessage(io, socket, data, ack as Parameters<typeof handleSendMessage>[3])
      }
    )

    socket.on('edit_message', (data: { messageId: string; content: string }, ack: (r: unknown) => void) => {
      handleEditMessage(io, socket, data, ack as Parameters<typeof handleEditMessage>[3])
    })

    socket.on('delete_message', (data: { messageId: string }, ack: (r: unknown) => void) => {
      handleDeleteMessage(io, socket, data, ack as Parameters<typeof handleDeleteMessage>[3])
    })

    socket.on('get_messages', (data: { otherUserId: string; beforeId?: string; limit?: number }, ack: (r: unknown) => void) => {
      handleGetMessages(socket, data, ack as Parameters<typeof handleGetMessages>[2])
    })

    socket.on('get_chats', (_data: unknown, ack: (r: unknown) => void) => {
      handleGetChats(socket, _data, ack as Parameters<typeof handleGetChats>[2])
    })

    socket.on('get_user_id', (data: { username: string }, ack: (r: unknown) => void) => {
      handleGetUserId(socket, data, ack as Parameters<typeof handleGetUserId>[2])
    })

    socket.on('messages_read', (data: { otherUserId: string }, ack: (r: unknown) => void) => {
      handleMessagesRead(io, socket, data, ack as Parameters<typeof handleMessagesRead>[3])
    })

    socket.on('typing', (data: { otherUserId: string; isTyping: boolean }) => {
      handleTyping(io, socket, data)
    })

    socket.on('disconnect', () => onDisconnect(io, socket))
  })
}
