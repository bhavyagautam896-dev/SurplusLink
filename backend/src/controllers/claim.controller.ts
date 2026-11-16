import { Request, Response, NextFunction } from 'express';
import { claimService } from '../services/claim.service.js';
import { claimRepository } from '../repositories/claim.repository.js';
import { AppError } from '../middleware/error.middleware.js';

export class ClaimController {
  async claim(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ngoId = req.user?.ngoId;
      if (!ngoId) {
        throw new AppError('Only registered NGOs can claim surplus food listings', 403);
      }

      const claim = await claimService.claimListing(req.params.id, ngoId);

      res.status(201).json({
        success: true,
        data: claim,
      });
    } catch (err) {
      next(err);
    }
  }

  async pickup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ngoId = req.user?.ngoId;
      if (!ngoId) {
        throw new AppError('Only registered NGOs can mark food as picked up', 403);
      }

      const claim = await claimService.markPickup(req.params.id, ngoId);

      res.status(200).json({
        success: true,
        data: claim,
      });
    } catch (err) {
      next(err);
    }
  }

  async complete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const donorId = req.user?.donorId;
      if (!donorId) {
        throw new AppError('Only the food donor can confirm completed handoff', 403);
      }

      const claim = await claimService.completeClaim(req.params.id, donorId);

      res.status(200).json({
        success: true,
        data: claim,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let claims;
      if (req.user?.role === 'NGO' && req.user.ngoId) {
        claims = await claimService.getClaimsByNgo(req.user.ngoId);
      } else if (req.user?.role === 'DONOR' && req.user.donorId) {
        claims = await claimService.getClaimsByDonor(req.user.donorId);
      } else {
        throw new AppError('Claims are only available for Donors and NGOs', 403);
      }

      res.status(200).json({
        success: true,
        data: claims,
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const claim = await claimRepository.findById(req.params.id);
      if (!claim) {
        throw new AppError('Claim not found', 404);
      }

      res.status(200).json({
        success: true,
        data: claim,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const claimController = new ClaimController();
