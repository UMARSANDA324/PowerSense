export const slugify = (value) => {
  if (!value) return "";
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/\/+?/g, "-")
    .replace(/[^a-z0-9.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
};

export const buildLocationSlug = (stateName, lgaName, wardName) => {
  const parts = [stateName, lgaName, wardName].map(slugify).filter(Boolean);
  return parts.join("-").replace(/-+/g, "-");
};

const makeStableId = (prefix, ...parts) => {
  const idParts = parts
    .map((part) => slugify(part).toUpperCase())
    .filter(Boolean);

  return `${prefix}-${idParts.join("-")}`.replace(/-+/g, "-");
};

export const buildLGAStableId = (stateName, lgaName) => makeStableId("LGA", stateName, lgaName);
export const buildAreaStableId = (stateName, lgaName, areaName) => makeStableId("AREA", stateName, lgaName, areaName);
export const buildAreaSlug = (areaName) => slugify(areaName);
