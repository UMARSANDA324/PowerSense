import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rolemiddleware.js';
import {
  getExecutiveDashboardController,
  getExecutiveAssistantController,
  getPredictiveAnalyticsController,
  getAutomationController,
  getReportsController,
  getExpansionController,
  getApiCenterController,
  getIntelligenceScoreController,
  getDecisionCenterController,
  getFutureIntegrationsController
} from '../controllers/enterpriseIntelligenceController.js';

const router = express.Router();
const platformOwnerOnly = authorize('platform-owner');

router.get('/executive-dashboard', protect, platformOwnerOnly, getExecutiveDashboardController);
router.get('/assistant', protect, platformOwnerOnly, getExecutiveAssistantController);
router.get('/predictions', protect, platformOwnerOnly, getPredictiveAnalyticsController);
router.get('/automation', protect, platformOwnerOnly, getAutomationController);
router.get('/reports', protect, platformOwnerOnly, getReportsController);
router.get('/expansion', protect, platformOwnerOnly, getExpansionController);
router.get('/api-center', protect, platformOwnerOnly, getApiCenterController);
router.get('/intelligence-score', protect, platformOwnerOnly, getIntelligenceScoreController);
router.get('/decision-center', protect, platformOwnerOnly, getDecisionCenterController);
router.get('/future-integrations', protect, platformOwnerOnly, getFutureIntegrationsController);

export default router;
