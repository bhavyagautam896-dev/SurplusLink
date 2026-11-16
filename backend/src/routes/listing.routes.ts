import { Router } from 'express';
import { listingController } from '../controllers/listing.controller.js';
import { claimController } from '../controllers/claim.controller.js';
import { authenticateUser, authorizeRole } from '../middleware/auth.middleware.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.middleware.js';
import { createListingSchema, updateListingSchema, nearbyListingsQuerySchema } from '../validators/listing.validator.js';
import { claimListingParamsSchema } from '../validators/claim.validator.js';

const router = Router();

// Protected: Donors can create listings
router.post(
  '/',
  authenticateUser,
  authorizeRole('DONOR'),
  validateBody(createListingSchema),
  listingController.create
);

// Protected: Donors can view their own listings
router.get(
  '/mine',
  authenticateUser,
  authorizeRole('DONOR'),
  listingController.getMine
);

// Protected: NGOs can discover nearby available listings
router.get(
  '/nearby',
  authenticateUser,
  authorizeRole('NGO'),
  validateQuery(nearbyListingsQuerySchema),
  listingController.getNearby
);

// Protected: NGOs can claim a listing
router.post(
  '/:id/claim',
  authenticateUser,
  authorizeRole('NGO'),
  validateParams(claimListingParamsSchema),
  claimController.claim
);

// Get single listing details
router.get(
  '/:id',
  validateParams(claimListingParamsSchema),
  listingController.getById
);

// Protected: Donors can update their OPEN listing
router.patch(
  '/:id',
  authenticateUser,
  authorizeRole('DONOR'),
  validateParams(claimListingParamsSchema),
  validateBody(updateListingSchema),
  listingController.update
);

export default router;
