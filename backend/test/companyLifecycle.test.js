import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCompanyStatus, getCompanyStatusLabel } from '../utils/companyLifecycle.js';

test('normalizeCompanyStatus maps pending setup values to the persisted lifecycle status', () => {
  assert.equal(normalizeCompanyStatus('Pending Setup'), 'pending-setup');
  assert.equal(normalizeCompanyStatus('pending setup'), 'pending-setup');
  assert.equal(normalizeCompanyStatus('pending-setup'), 'pending-setup');
});

test('normalizeCompanyStatus preserves supported lifecycle values', () => {
  assert.equal(normalizeCompanyStatus('active'), 'active');
  assert.equal(normalizeCompanyStatus('suspended'), 'suspended');
  assert.equal(normalizeCompanyStatus('archived'), 'archived');
  assert.equal(normalizeCompanyStatus('inactive'), 'inactive');
});

test('getCompanyStatusLabel returns human readable labels', () => {
  assert.equal(getCompanyStatusLabel('pending-setup'), 'Pending Setup');
  assert.equal(getCompanyStatusLabel('active'), 'Active');
  assert.equal(getCompanyStatusLabel('suspended'), 'Suspended');
  assert.equal(getCompanyStatusLabel('archived'), 'Archived');
});
