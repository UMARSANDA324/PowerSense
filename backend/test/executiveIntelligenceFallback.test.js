import assert from 'node:assert/strict';

import { buildExecutiveFallback } from '../services/executiveIntelligenceService.js';

const fallback = buildExecutiveFallback({
  metrics: { totalCompanies: 0, totalUsers: 0, totalReports: 0 },
  missionControl: { monitoring: { summary: { status: 'Unknown' } } },
  trends: {
    companies: { current: 0, previous: 0, direction: 'flat' },
    users: { current: 0, previous: 0, direction: 'flat' },
    reports: { current: 0, previous: 0, direction: 'flat' }
  },
  weeklyTrend: { summary: { totalReports: 0 } }
});

assert.equal(typeof fallback.summary, 'string');
assert.equal(Array.isArray(fallback.insights), true);
assert.equal(Array.isArray(fallback.recommendations), true);
assert.equal(fallback.healthScore.score >= 0, true);
assert.equal(Array.isArray(fallback.risks), true);

console.log('executive intelligence fallback ok');
