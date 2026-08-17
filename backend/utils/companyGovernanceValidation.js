export const VALID_LIFECYCLE_STATES = ['draft', 'active', 'suspended', 'archived'];

export const normalizeLifecycleState = (value) => {
  if (!value) return 'draft';

  const normalized = String(value).toLowerCase().trim();
  if (normalized === 'inactive') return 'draft';
  if (normalized === 'pending') return 'draft';
  if (normalized === 'enabled') return 'active';
  if (normalized === 'disabled') return 'suspended';
  return VALID_LIFECYCLE_STATES.includes(normalized) ? normalized : 'draft';
};

export const buildLifecycleStatus = (state) => {
  const normalized = normalizeLifecycleState(state);
  if (normalized === 'draft' || normalized === 'archived') return 'inactive';
  return normalized;
};

export const validateGovernanceRoleBoundary = (userRole, targetRole) => {
  const normalizedUserRole = String(userRole || '').toLowerCase().trim();
  const normalizedTargetRole = String(targetRole || '').toLowerCase().trim();

  if (normalizedUserRole === 'company-super-admin' && normalizedTargetRole === 'platform-owner') {
    return {
      valid: false,
      reason: 'Company Super Admin cannot perform platform governance actions.'
    };
  }

  return { valid: true };
};
