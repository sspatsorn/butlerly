import { Router, Request, Response } from 'express'
import { taskRepository } from '../repositories/task.repository'
import { userRepository } from '../repositories/user.repository'
import { registrationService } from '../services/registration.service'
import { taskService } from '../services/task.service'

const router = Router()

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'linetask-backend' })
})

router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const lineUserId = req.query.lineUserId as string
    if (!lineUserId) {
      res.status(400).json({ error: 'lineUserId is required' })
      return
    }

    const user = await userRepository.findByLineUserId(lineUserId)
    if (!user) {
      res.json({ tasks: [] })
      return
    }

    const status = req.query.status as string | undefined
    const tasks = await taskRepository.listAll(user.id, status)
    res.json({ tasks })
  } catch (error) {
    console.error('GET /tasks error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/tasks/today', async (req: Request, res: Response) => {
  try {
    const lineUserId = req.query.lineUserId as string
    if (!lineUserId) {
      res.status(400).json({ error: 'lineUserId is required' })
      return
    }

    const user = await userRepository.findByLineUserId(lineUserId)
    if (!user) {
      res.json({ tasks: [] })
      return
    }

    const tasks = await taskRepository.listToday(user.id)
    res.json({ tasks })
  } catch (error) {
    console.error('GET /tasks/today error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/tasks/:id/status', async (req: Request, res: Response) => {
  try {
    const { lineUserId, status } = req.body
    if (!lineUserId || !status) {
      res.status(400).json({ error: 'lineUserId and status are required' })
      return
    }

    const user = await userRepository.findByLineUserId(lineUserId)
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const taskId = req.params.id as string
    const task = await taskRepository.updateStatus(taskId, user.id, status)
    res.json({ task })
  } catch (error) {
    console.error('PATCH /tasks/:id/status error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const { lineUserId, title, deadline } = req.body as {
      lineUserId?: string
      title?: string
      deadline?: string | null
    }

    if (!lineUserId) {
      res.status(400).json({ error: 'lineUserId is required' })
      return
    }

    if (title === undefined && deadline === undefined) {
      res.status(400).json({ error: 'title or deadline is required' })
      return
    }

    const user = await userRepository.findByLineUserId(lineUserId)
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const taskId = req.params.id as string
    const message = await taskService.updateTaskDetails(user.id, taskId, { title, deadline })
    if (message.startsWith('❌')) {
      res.status(400).json({ error: message.replace('❌ ', '') })
      return
    }

    const task = await taskRepository.findById(taskId, user.id)
    res.json({ task, message })
  } catch (error) {
    console.error('PATCH /tasks/:id error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/register/status', async (req: Request, res: Response) => {
  try {
    const lineUserId = req.query.lineUserId as string
    if (!lineUserId) {
      res.status(400).json({ error: 'lineUserId is required' })
      return
    }

    const user = await userRepository.findByLineUserId(lineUserId)
    if (!user) {
      res.json({ registered: false, user: null })
      return
    }

    res.json({
      registered: user.is_registered,
      user: user.is_registered
        ? { fullName: user.full_name, phone: user.phone, lineUserId: user.line_user_id }
        : null,
    })
  } catch (error) {
    console.error('GET /register/status error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { lineUserId, fullName, phone } = req.body
    if (!lineUserId || !fullName || !phone) {
      res.status(400).json({ error: 'lineUserId, fullName and phone are required' })
      return
    }

    const user = await registrationService.registerFromWeb(lineUserId, fullName, phone)

    res.json({
      success: true,
      user: {
        fullName: user.full_name,
        phone: user.phone,
        lineUserId: user.line_user_id,
      },
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'INVALID_PHONE') {
        res.status(400).json({ error: 'เบอร์โทรไม่ถูกต้อง กรุณากรอก 10 หลัก เช่น 0812345678' })
        return
      }
      if (error.message === 'INVALID_NAME') {
        res.status(400).json({ error: 'กรุณากรอกชื่อ-นามสกุลอย่างน้อย 2 ตัวอักษร' })
        return
      }
    }
    console.error('POST /register error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
