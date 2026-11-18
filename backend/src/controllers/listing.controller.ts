import { Request, Response, NextFunction } from 'express';
import { listingRepository } from '../repositories/listing.repository.js';
import { matchingService } from '../services/matching.service.js';
import { AppError } from '../middleware/error.middleware.js';

export class ListingController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const donorId = req.user?.donorId;
      if (!donorId) {
        throw new AppError('Only registered food donors can post listings', 403);
      }

      const listing = await listingRepository.create({
        donor_id: donorId,
        food_type: req.body.foodType,
        description: req.body.description,
        quantity_kg: req.body.quantityKg,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        safe_until: req.body.safeUntil,
        pickup_instructions: req.body.pickupInstructions,
      });

      res.status(201).json({
        success: true,
        data: listing,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const donorId = req.user?.donorId;
      if (!donorId) {
        throw new AppError('Only registered food donors can view their listings', 403);
      }

      const listings = await listingRepository.findByDonorId(donorId);
      res.status(200).json({
        success: true,
        data: listings,
      });
    } catch (err) {
      next(err);
    }
  }

  async getNearby(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ngoId = req.user?.ngoId;
      if (!ngoId) {
        throw new AppError('Only registered NGOs can access nearby surplus food feeds', 403);
      }

      const listings = await matchingService.getNearbyEligibleListings(
        ngoId,
        req.query as any
      );

      res.status(200).json({
        success: true,
        data: listings,
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const listing = await listingRepository.findById(req.params.id);
      if (!listing) {
        throw new AppError('Listing not found', 404);
      }

      res.status(200).json({
        success: true,
        data: listing,
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const donorId = req.user?.donorId;
      if (!donorId) {
        throw new AppError('Only food donors can modify listings', 403);
      }

      const existing = await listingRepository.findById(req.params.id);
      if (!existing) {
        throw new AppError('Listing not found', 404);
      }

      if (existing.donor_id !== donorId) {
        throw new AppError('You can only update your own listings', 403);
      }

      if (existing.status !== 'OPEN') {
        throw new AppError(`Cannot modify listing: status is ${existing.status}`, 400);
      }

      const updated = await listingRepository.update(req.params.id, donorId, {
        food_type: req.body.foodType,
        description: req.body.description,
        quantity_kg: req.body.quantityKg,
        safe_until: req.body.safeUntil,
        pickup_instructions: req.body.pickupInstructions,
      });

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const listingController = new ListingController();

