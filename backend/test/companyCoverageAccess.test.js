import assert from 'node:assert/strict';

import {
  resolveAllowedStateNamesForUser,
  isStateAllowedForUser
} from '../controllers/locationController.js';

const companyA = { _id: 'company-a', coverageStates: ['Kano', 'Jigawa'] };
const companyB = { _id: 'company-b', coverageStates: ['Katsina'] };

const userA = { role: 'company-super-admin', companyId: 'company-a' };
const userB = { role: 'company-super-admin', companyId: 'company-b' };

const main = async () => {
  const allowedA = await resolveAllowedStateNamesForUser(userA, companyA);
  const allowedB = await resolveAllowedStateNamesForUser(userB, companyB);

  assert.deepEqual(allowedA, ['Kano', 'Jigawa']);
  assert.deepEqual(allowedB, ['Katsina']);

  assert.equal(isStateAllowedForUser(userA, 'Kano', allowedA), true);
  assert.equal(isStateAllowedForUser(userA, 'Katsina', allowedA), false);
  assert.equal(isStateAllowedForUser(userB, 'Jigawa', allowedB), false);

  console.log('company coverage access checks passed');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
