import express, { Router, Request } from 'express'
import multer, { FileFilterCallback } from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'


const __dirname = path.dirname(fileURLToPath(import.meta.url))

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads')
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (err: Error | null, dest: string) => void) => cb(null, UPLOAD_DIR),
  filename: (_req: Request, file: Express.Multer.File, cb: (err: Error | null, name: string) => void) => {
    const ext = path.extname(file.originalname) || path.extname(file.mimetype) || ''
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`
    cb(null, name)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Недопустимый тип файла'))
    }
  },
})

const router = Router()

router.post('/', upload.single('file'), (req: Request, res: express.Response) => {
  const file = (req as Request & { file?: Express.Multer.File }).file
  if (!file) {
    res.status(400).json({ error: 'Файл не загружен' })
    return
  }
  const url = `/api/uploads/${file.filename}`
  res.json({ url, fileName: file.originalname, fileSize: file.size })
})

router.use((err: unknown, _req: Request, res: express.Response, _next: express.NextFunction) => {
  if (err && typeof err === 'object' && 'code' in err && err.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({ error: 'Файл слишком большой (макс. 10 MB)' })
    return
  }
  const message = err instanceof Error ? err.message : 'Ошибка загрузки'
  res.status(400).json({ error: message })
})

export default router
