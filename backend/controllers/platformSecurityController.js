import asyncHandler from 'express-async-handler';
import {
  getSecurityDashboard,
  getSessionSummary,
  getLoginHistory,
  getComplianceSnapshot,
  getBackupSnapshot,
  createSecurityAudit
} from '../services/platformSecurityService.js';

export const getSecurityDashboardController = asyncHandler(async (req, res) => {
  const dashboard = await getSecurityDashboard();
  res.json({ success: true, data: dashboard });
});

export const getSessionManagementController = asyncHandler(async (req, res) => {
  const sessions = await getSessionSummary();
  res.json({ success: true, data: sessions });
});

export const getLoginHistoryController = asyncHandler(async (req, res) => {
  const { limit, skip, search, status } = req.query;
  const history = await getLoginHistory({
    limit: Number(limit) || 20,
    skip: Number(skip) || 0,
    search: search || '',
    status: status || ''
  });
  res.json({ success: true, data: history });
});

export const getComplianceController = asyncHandler(async (req, res) => {
  const compliance = await getComplianceSnapshot();
  res.json({ success: true, data: compliance });
});

export const getBackupController = asyncHandler(async (req, res) => {
  const backup = await getBackupSnapshot();
  res.json({ success: true, data: backup });
});

export const createSecurityAuditController = asyncHandler(async (req, res) => {
  const audit = await createSecurityAudit(req.body);
  res.status(201).json({ success: true, data: audit });
});
