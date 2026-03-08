import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

/** URL бэкенда: в dev через proxy, в проде — тот же хост */
function getSocketUrl(): string {
  if (import.meta.env.DEV) return ''
  return import.meta.env.VITE_API_URL || ''
}

export function getSocket(): Socket | null {
  return socket
}

export function connectSocket(): Socket {
  if (socket?.connected) return socket
  socket = io(getSocketUrl(), {
    path: '/socket.io',
    autoConnect: true,
  })
  return socket
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
