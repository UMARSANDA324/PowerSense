import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rolemiddleware.js';
import {
  getSecurityDashboardController,
  getSessionManagementController,
  getLoginHistoryController,
  getComplianceController,
  getBackupController,
  createSecurityAuditController
} from '../controllers/platformSecurityController.js';

const router = express.Router();
const platformOwnerOnly = authorize('platform-owner');

router.get('/dashboard', protect, platformOwnerOnly, getSecurityDashboardController);
router.get('/sessions', protect, platformOwnerOnly, getSessionManagementController);
router.get('/login-history', protect, platformOwnerOnly, getLoginHistoryController);
router.get('/compliance', protect, platformOwnerOnly, getComplianceController);
router.get('/backup-recovery', protect, platformOwnerOnly, getBackupController);
router.post('/audit', protect, platformOwnerOnly, createSecurityAuditController);

export default router;
