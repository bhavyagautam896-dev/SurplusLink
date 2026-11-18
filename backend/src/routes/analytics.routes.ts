import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller.js';

const router = Router();

// Public / shared analytics endpoints
router.get('/overview', analyticsController.getOverview);
router.get('/map', analyticsController.getMap);
router.get('/hotspots', analyticsController.getHotspots);
router.get('/rescued-trend', analyticsController.getRescuedTrend);
router.get('/claim-times', analyticsController.getClaimTimes);
router.get('/matching', analyticsController.getMatching);

export default router;

