import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRiskScore, getDefaultSecurityPolicies } from '../services/platformSecurityService.js';

test('calculateRiskScore weights repeated security events', () => {
  const score = calculateRiskScore({
    failedLogins: 5,
    tokenFailures: 3,
    suspiciousActivities: 2,
    inactiveSuperAdmins: 1,
    permissionChanges: 4,
    configurationEdits: 2
  });

  assert.ok(score >= 60);
  assert.ok(score <= 100);
});

test('getDefaultSecurityPolicies provide centralized policy defaults', () => {
  const policies = getDefaultSecurityPolicies();

  assert.equal(policies.minimumPasswordLength, 12);
  assert.equal(policies.maxLoginAttempts, 5);
  assert.equal(policies.sessionTimeoutMinutes, 30);
  assert.equal(policies.lockoutDurationMinutes, 15);
});
