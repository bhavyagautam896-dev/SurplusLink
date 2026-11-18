import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service.js';

export class AnalyticsController {
  async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await analyticsService.getOverview();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMap(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await analyticsService.getMapLayers();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  async getHotspots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await analyticsService.getHotspots();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  async getRescuedTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await analyticsService.getRescuedTrend();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  async getClaimTimes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await analyticsService.getClaimTimes();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMatching(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await analyticsService.getMatchingStats();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const analyticsController = new AnalyticsController();

