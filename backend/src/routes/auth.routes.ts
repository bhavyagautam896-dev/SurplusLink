import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { authenticateUser } from '../middleware/auth.middleware.js';
import { loginSchema, registerDonorSchema, registerNgoSchema } from '../validators/auth.validator.js';
import { z } from 'zod';

const router = Router();

const registerUnionSchema = z.discriminatedUnion('role', [
  registerDonorSchema,
  registerNgoSchema,
]);

router.post('/register', validateBody(registerUnionSchema), authController.register);
router.post('/login', validateBody(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticateUser, authController.getMe);

export default router;

