import { Router } from 'express';
import { claimController } from '../controllers/claim.controller.js';
import { authenticateUser, authorizeRole } from '../middleware/auth.middleware.js';
import { validateParams } from '../middleware/validate.middleware.js';
import { updateClaimStatusParamsSchema } from '../validators/claim.validator.js';

const router = Router();

// Protected: Get user claims (NGO or Donor)
router.get('/mine', authenticateUser, claimController.getMine);

// Protected: NGO marks food as picked up
router.post(
  '/:id/pickup',
  authenticateUser,
  authorizeRole('NGO'),
  validateParams(updateClaimStatusParamsSchema),
  claimController.pickup
);

// Protected: Donor confirms completion
router.post(
  '/:id/complete',
  authenticateUser,
  authorizeRole('DONOR', 'ADMIN'),
  validateParams(updateClaimStatusParamsSchema),
  claimController.complete
);

// Protected: Get claim by ID
router.get(
  '/:id',
  authenticateUser,
  validateParams(updateClaimStatusParamsSchema),
  claimController.getById
);

export default router;

