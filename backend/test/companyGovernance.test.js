import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeLifecycleState,
  buildLifecycleStatus,
  validateGovernanceRoleBoundary
} from '../utils/companyGovernanceValidation.js';

test('normalizeLifecycleState maps legacy values to the approved lifecycle states', () => {
  assert.equal(normalizeLifecycleState('inactive'), 'draft');
  assert.equal(normalizeLifecycleState('active'), 'active');
  assert.equal(normalizeLifecycleState('suspended'), 'suspended');
  assert.equal(normalizeLifecycleState('archived'), 'archived');
});

test('buildLifecycleStatus preserves the legacy status mapping for existing integrations', () => {
  assert.equal(buildLifecycleStatus('draft'), 'inactive');
  assert.equal(buildLifecycleStatus('active'), 'active');
  assert.equal(buildLifecycleStatus('suspended'), 'suspended');
  assert.equal(buildLifecycleStatus('archived'), 'inactive');
});

test('validateGovernanceRoleBoundary blocks company super admins from platform governance actions', () => {
  const result = validateGovernanceRoleBoundary('company-super-admin', 'platform-owner');
  assert.equal(result.valid, false);
  assert.match(result.reason, /platform governance/i);
});
