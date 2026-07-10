import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import State from '../models/Location/State.js';
import LGA from '../models/Location/LGA.js';
import Ward from '../models/Location/Ward.js';
import { buildAreaSlug, buildAreaStableId, buildLGAStableId, slugify } from '../utils/slugGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('Missing MongoDB connection string in .env');
  process.exit(1);
}

const MASTER_FILE = path.join(__dirname, '../data/kanoCommunities.json');
const LOOKUP_FILE = path.join(__dirname, 'communityLookup.json');

const loadMasterDataset = () => {
  if (!fs.existsSync(MASTER_FILE)) {
    console.error(`Master Kano community file not found: ${MASTER_FILE}`);
    process.exit(1);
  }

  const rawJson = fs.readFileSync(MASTER_FILE, 'utf-8');
  const parsed = JSON.parse(rawJson);
  const entries = Array.isArray(parsed) ? parsed : parsed.lgas || [];

  if (!Array.isArray(entries) || entries.length === 0) {
    console.error(`Master Kano community file is empty or malformed: ${MASTER_FILE}`);
    process.exit(1);
  }

  return entries.map((entry) => ({
    lga_name: String(entry.lga_name || entry.lga || '').trim(),
    lga_id: String(entry.lga_id || '').trim(),
    communities: Array.isArray(entry.communities) ? entry.communities : []
  }));
};

const normalizeName = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.replace(/\s+\d{2,6}$/g, '').trim();
};

const normalizeLookupKey = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]/g, '');
};

const buildCommunityId = (lgaName, communityName) => {
  const lgaSlug = slugify(lgaName);
  const communitySlug = buildAreaSlug(communityName);
  return `${lgaSlug}_${communitySlug}`;
};

const ensureUniqueSlug = async (baseSlug, lgaId) => {
  let slug = baseSlug;
  let suffix = 1;
  let existing = await Ward.findOne({ slug, lga: lgaId });
  while (existing) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
    existing = await Ward.findOne({ slug, lga: lgaId });
  }
  return slug;
};

const loadLookup = () => {
  if (!fs.existsSync(LOOKUP_FILE)) return {};
  return JSON.parse(fs.readFileSync(LOOKUP_FILE, 'utf-8'));
};

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const state = await State.findOne({ name: 'Kano' });
  if (!state) {
    console.error('Kano state not found');
    process.exit(1);
  }

  const lookup = loadLookup();
  const DATASET = loadMasterDataset();
  const report = {
    lgasProcessed: 0,
    communitiesAdded: 0,
    communitiesUpdated: 0,
    duplicatesRemoved: [],
    missingLgas: [],
    missingCommunities: [],
    normalizationChanges: [],
    membershipWarnings: [],
    idConflicts: [],
    lookupEntriesAdded: 0,
    lgaCounts: {}
  };

  for (const entry of DATASET) {
    const lgaName = normalizeName(entry.lga_name);
    if (!lgaName) {
      report.missingLgas.push(entry);
      continue;
    }

    const lga = await LGA.findOne({ name: lgaName, state: state._id });
    if (!lga) {
      report.missingLgas.push(lgaName);
      continue;
    }

    const stableLgaId = buildLGAStableId(state.name, lga.name);
    const lgaSlug = slugify(lga.name);
    let lgaChanged = false;
    if (!lga.id || lga.id !== stableLgaId) {
      lga.id = stableLgaId;
      lgaChanged = true;
    }
    if (!lga.lgaId || lga.lgaId !== stableLgaId) {
      lga.lgaId = stableLgaId;
      lgaChanged = true;
    }
    if (!lga.slug || lga.slug !== lgaSlug) {
      lga.slug = lgaSlug;
      lgaChanged = true;
    }
    if (lgaChanged) await lga.save();

    report.lgasProcessed += 1;
    const addedPerLga = { added: 0, updated: 0, skipped: 0 };
    const seenNames = new Set();
    const rawCommunities = Array.isArray(entry.communities) ? entry.communities : [];

    for (const rawCommunity of rawCommunities) {
      let original = '';
      if (typeof rawCommunity === 'string') {
        original = rawCommunity.trim();
      } else if (rawCommunity && typeof rawCommunity === 'object') {
        original = String(rawCommunity.name || rawCommunity.original_name || rawCommunity.displayName || '').trim();
      }

      const normalized = normalizeName(original);
      if (!normalized) {
        report.missingCommunities.push({ lga: lgaName, original });
        continue;
      }
      if (normalized.toLowerCase() !== original.toLowerCase()) {
        report.normalizationChanges.push({ lga: lgaName, original, normalized });
      }
      const nameKey = normalized.toLowerCase();
      if (seenNames.has(nameKey)) {
        report.duplicatesRemoved.push({ lga: lgaName, community: normalized });
        addedPerLga.skipped += 1;
        continue;
      }
      seenNames.add(nameKey);

      const communityId = buildCommunityId(lga.name, normalized);
      const baseSlug = buildAreaSlug(normalized);
      const slug = await ensureUniqueSlug(baseSlug, lga._id);
      const areaId = buildAreaStableId(state.name, lga.name, normalized);

      const existingWardById = await Ward.findOne({ id: communityId });
      const existingWardByName = await Ward.findOne({ name: normalized, lga: lga._id });
      const crossLgaWard = await Ward.findOne({ name: normalized, lga: { $ne: lga._id }, state: state._id });
      if (crossLgaWard) {
        report.membershipWarnings.push({ community: normalized, expectedLga: lgaName, foundIn: crossLgaWard.lgaName || 'unknown' });
      }
      if (existingWardById && String(existingWardById.lga) !== String(lga._id)) {
        report.idConflicts.push({ lga: lgaName, community: normalized, existingId: existingWardById.id, existingLga: existingWardById.lgaName });
        addedPerLga.skipped += 1;
        continue;
      }

      let ward;
      if (existingWardById || existingWardByName) {
        ward = existingWardById || existingWardByName;
        let updated = false;
        if (!ward.id) { ward.id = communityId; updated = true; }
        if (!ward.slug || ward.slug !== slug) { ward.slug = slug; updated = true; }
        if (!ward.areaId || ward.areaId !== areaId) { ward.areaId = areaId; updated = true; }
        if (!ward.lgaId || ward.lgaId !== stableLgaId) { ward.lgaId = stableLgaId; updated = true; }
        if (!ward.lgaName || ward.lgaName !== lga.name) { ward.lgaName = lga.name; updated = true; }
        if (!ward.state || String(ward.state) !== String(state._id)) { ward.state = state._id; updated = true; }
        if (!ward.country) { ward.country = 'Nigeria'; updated = true; }
        if (!Array.isArray(ward.aliases)) { ward.aliases = []; updated = true; }
        if (ward.latitude === undefined) { ward.latitude = null; updated = true; }
        if (ward.longitude === undefined) { ward.longitude = null; updated = true; }
        if (ward.coordinates === undefined) { ward.coordinates = null; updated = true; }
        if (!ward.status) { ward.status = 'active'; updated = true; }
        if (ward.isUrban === undefined) { ward.isUrban = true; updated = true; }
        if (ward.isActive === false) { ward.isActive = true; updated = true; }
        if (updated) {
          await ward.save();
          report.communitiesUpdated += 1;
          addedPerLga.updated += 1;
        }
      } else {
        ward = await Ward.create({
          name: normalized,
          wardName: normalized,
          id: communityId,
          areaId,
          slug,
          lga: lga._id,
          lgaId: stableLgaId,
          lgaName: lga.name,
          state: state._id,
          country: 'Nigeria',
          aliases: [],
          latitude: null,
          longitude: null,
          coordinates: null,
          isUrban: true,
          status: 'active',
          feederIds: [],
          isActive: true
        });
        report.communitiesAdded += 1;
        addedPerLga.added += 1;
      }

      const lookupKey = normalizeLookupKey(normalized);
      if (lookupKey) {
        if (!lookup[lookupKey]) lookup[lookupKey] = [];
        const alreadyExists = lookup[lookupKey].some((item) => item.communityId === ward.id && item.lga === lga.name && item.slug === ward.slug);
        if (!alreadyExists) {
          lookup[lookupKey].push({ lga: lga.name, communityId: ward.id, slug: ward.slug });
          report.lookupEntriesAdded += 1;
        }
      }
    }

    report.lgaCounts[lga.name] = addedPerLga;
  }

  const sortedLookup = Object.keys(lookup).sort().reduce((acc, key) => {
    acc[key] = lookup[key];
    return acc;
  }, {});
  fs.writeFileSync(LOOKUP_FILE, JSON.stringify(sortedLookup, null, 2));

  console.log('=== IMPORT SUMMARY ===');
  console.log(`LGAs processed: ${report.lgasProcessed}`);
  console.log('Communities added per LGA:');
  for (const [lga, counts] of Object.entries(report.lgaCounts)) {
    console.log(` - ${lga}: added=${counts.added}, updated=${counts.updated}, skipped=${counts.skipped}`);
  }
  console.log(`Total communities added: ${report.communitiesAdded}`);
  console.log(`Total communities updated: ${report.communitiesUpdated}`);
  console.log(`Lookup entries added: ${report.lookupEntriesAdded}`);
  console.log('Missing LGAs:', report.missingLgas.length ? JSON.stringify(report.missingLgas, null, 2) : 'none');
  console.log('Missing communities:', report.missingCommunities.length ? JSON.stringify(report.missingCommunities, null, 2) : 'none');
  console.log('Duplicates removed:', report.duplicatesRemoved.length ? JSON.stringify(report.duplicatesRemoved, null, 2) : 'none');
  console.log('Normalization changes:', report.normalizationChanges.length ? JSON.stringify(report.normalizationChanges, null, 2) : 'none');
  console.log('Membership warnings:', report.membershipWarnings.length ? JSON.stringify(report.membershipWarnings, null, 2) : 'none');
  console.log('ID conflicts:', report.idConflicts.length ? JSON.stringify(report.idConflicts, null, 2) : 'none');
  console.log('Final validation:');
  console.log(` - expected LGAs: ${DATASET.length}`);
  console.log(` - imported LGAs: ${report.lgasProcessed}`);
  console.log(` - communities total processed: ${DATASET.reduce((sum, entry) => sum + entry.communities.length, 0)}`);
  console.log(` - communities added: ${report.communitiesAdded}`);
  console.log(` - communities updated: ${report.communitiesUpdated}`);
  console.log(` - total anomalies detected: ${report.missingLgas.length + report.missingCommunities.length + report.duplicatesRemoved.length + report.membershipWarnings.length + report.idConflicts.length}`);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error('Import failed:', error);
  process.exit(1);
});