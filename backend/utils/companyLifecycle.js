const STATUS_LABELS = {
  'pending-setup': 'Pending Setup',
  active: 'Active',
  suspended: 'Suspended',
  archived: 'Archived',
  inactive: 'Inactive'
};

export const normalizeCompanyStatus = (status) => {
  if (!status || typeof status !== 'string') {
    return 'pending-setup';
  }

  const normalized = status.trim().toLowerCase().replace(/\s+/g, '-');
  if (normalized === 'pending-setup' || normalized === 'pending_setup' || normalized === 'pending') {
    return 'pending-setup';
  }

  if (['active', 'suspended', 'archived', 'inactive'].includes(normalized)) {
    return normalized;
  }

  return 'pending-setup';
};

export const getCompanyStatusLabel = (status) => {
  return STATUS_LABELS[normalizeCompanyStatus(status)] || STATUS_LABELS['pending-setup'];
};
