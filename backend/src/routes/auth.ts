import { Router } from 'express'
import { login, facultySignup } from '../controllers/authController'

const router = Router()

/** POST /auth/login  — admin | faculty | student */
router.post('/login', login)

/** POST /auth/signup — faculty signup request */
router.post('/signup', facultySignup)

export default router
