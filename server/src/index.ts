import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { connectDb } from './db.js'
import { setupSocket } from './socket/index.js'
import uploadRouter from './routes/upload.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 3001
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads')

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'air',
}

const app = express()
app.use(cors({ origin: CLIENT_URL, credentials: true }))
app.use(express.json())

app.use('/api/upload', uploadRouter)
app.use('/api/uploads', express.static(UPLOAD_DIR))

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: CLIENT_URL },
  path: '/socket.io',
})

// В продакшене отдаём статику клиента
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist')
  app.use(express.static(clientDist))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

setupSocket(io)

connectDb(DB_CONFIG)
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`[Server] http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
