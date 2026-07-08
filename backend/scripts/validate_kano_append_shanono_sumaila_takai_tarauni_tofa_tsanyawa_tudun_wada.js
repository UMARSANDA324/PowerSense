import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import State from '../models/Location/State.js';
import LGA from '../models/Location/LGA.js';
import Ward from '../models/Location/Ward.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const targetLGAs = [
  { lga_name: 'Shanono', lga_id: 'lga_shanono', communities: [] },
  { lga_name: 'Sumaila', lga_id: 'lga_sumaila', communities: [] },
  { lga_name: 'Takai', lga_id: 'lga_takai', communities: [] },
  { lga_name: 'Tarauni', lga_id: 'lga_tarauni', communities: [] },
  { lga_name: 'Tofa', lga_id: 'lga_tofa', communities: [] },
  { lga_name: 'Tsanyawa', lga_id: 'lga_tsanyawa', communities: [] },
  { lga_name: 'Tudun Wada', lga_id: 'lga_tudun_wada', communities: [] }
];

const normalizeIdToken = (value) => {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .replace(/[-\s]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

const buildLgaId = (lgaName) => `lga_${normalizeIdToken(lgaName)}`;
const buildCommunityId = (lgaName, communityName) => `${normalizeIdToken(lgaName)}_${normalizeIdToken(communityName)}`;
const normalizeLookupKey = (value) => normalizeIdToken(value);

const report = {
  metadata: {
    generated_at: new Date().toISOString(),
    import_blocked: true,
    source: 'validation_only'
  },
  lgas_added: 0,
  communities_imported: 0,
  duplicate_lgas: [],
  duplicate_communities_removed: [],
  cross_lga_duplicate_names: [],
  wrong_lga_records_found: [],
  invalid_records: [],
  missing_ids: [],
  validation_errors: [],
  tarauni_validation: {
    existing_communities_found: 0,
    warning: 'Tarauni data appears incomplete; no existing project communities were found for this LGA.'
  },
  lookup_index_generated: false,
  dataset_validation: 'FAILED',
  validation_passed: false,
  lgas: []
};

const seenLgaNames = new Set();
const seenCommunityIds = new Set();
const seenCommunityNamesByLga = new Map();
const lookupIndex = {};

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) {
  report.validation_errors.push({ type: 'missing_database_connection', message: 'MongoDB connection string not available' });
} else {
  await mongoose.connect(uri);
}

let existingTarauniCommunities = [];
if (uri) {
  const state = await State.findOne({ name: 'Kano' });
  if (state) {
    const lgaDocs = await LGA.find({ state: state._id, name: { $in: targetLGAs.map((item) => item.lga_name) } });
    const lgaIds = lgaDocs.map((lga) => lga._id);
    existingTarauniCommunities = await Ward.find({ state: state._id, lga: { $in: lgaIds } }).sort({ name: 1 });
  }
}

if (uri) {
  await mongoose.disconnect();
}

for (const lga of targetLGAs) {
  const lgaName = lga.lga_name;
  const normalizedLgaName = lgaName.trim();
  if (!normalizedLgaName) {
    report.invalid_records.push({ type: 'empty_lga_name', lga: lgaName });
    report.validation_errors.push({ type: 'empty_lga_name', lga: lgaName });
    continue;
  }

  if (seenLgaNames.has(normalizedLgaName.toLowerCase())) {
    report.duplicate_lgas.push(normalizedLgaName);
    report.validation_errors.push({ type: 'duplicate_lga', lga: normalizedLgaName });
  }
  seenLgaNames.add(normalizedLgaName.toLowerCase());
  report.lgas_added += 1;

  const communities = [];
  const seenCommunityNames = new Set();
  const incomingCommunities = Array.isArray(lga.communities) ? lga.communities : [];

  for (const rawCommunity of incomingCommunities) {
    const displayName = typeof rawCommunity === 'string' ? rawCommunity.trim() : '';
    if (!displayName) {
      report.invalid_records.push({ type: 'empty_community_name', lga: lgaName, raw: rawCommunity });
      report.validation_errors.push({ type: 'empty_community_name', lga: lgaName, raw: rawCommunity });
      continue;
    }

    const key = displayName.toLowerCase();
    if (seenCommunityNames.has(key)) {
      report.duplicate_communities_removed.push({ lga: lgaName, community: displayName });
      report.validation_errors.push({ type: 'duplicate_community_within_lga', lga: lgaName, community: displayName });
      continue;
    }
    seenCommunityNames.add(key);

    const communityId = buildCommunityId(lgaName, displayName);
    if (!communityId) {
      report.missing_ids.push({ lga: lgaName, community: displayName });
      report.validation_errors.push({ type: 'missing_id', lga: lgaName, community: displayName });
      continue;
    }

    if (seenCommunityIds.has(communityId)) {
      report.validation_errors.push({ type: 'duplicate_community_id', lga: lgaName, community: displayName, id: communityId });
      continue;
    }
    seenCommunityIds.add(communityId);

    const communityRecord = {
      name: displayName,
      original_name: displayName,
      id: communityId,
      lga_id: lga.lga_id || buildLgaId(lgaName),
      latitude: null,
      longitude: null
    };

    communities.push(communityRecord);
    const lookupKey = normalizeLookupKey(displayName);
    if (!lookupIndex[lookupKey]) {
      lookupIndex[lookupKey] = [];
    }
    lookupIndex[lookupKey].push({ lga: lgaName, communityId: communityId });
  }

  communities.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  report.communities_imported += communities.length;
  report.lgas.push({ lga_name: lgaName, lga_id: lga.lga_id || buildLgaId(lgaName), communities });
  seenCommunityNamesByLga.set(lgaName, communities.map((c) => c.name));
}

report.tarauni_validation.existing_communities_found = existingTarauniCommunities.length;
if (report.tarauni_validation.existing_communities_found === 0) {
  report.validation_errors.push({
    type: 'tarauni_incomplete_data',
    lga: 'Tarauni',
    message: 'No existing Tarauni communities were found in the project database; import blocked to avoid fabricating data.'
  });
}

if (report.communities_imported === 0) {
  report.validation_errors.push({
    type: 'missing_communities',
    message: 'No community data was provided for the requested LGAs. Import blocked to avoid fabricating communities.'
  });
}

const errorCount = report.validation_errors.filter((entry) => entry && typeof entry === 'object').length;
report.validation_passed = errorCount === 0 && report.communities_imported > 0;
report.dataset_validation = report.validation_passed ? 'PASSED' : 'FAILED';
report.lookup_index_generated = report.validation_passed;

if (report.validation_passed) {
  const outDir = path.join(__dirname);
  fs.writeFileSync(path.join(outDir, 'communityLookup.json'), JSON.stringify(lookupIndex, null, 2));
  fs.writeFileSync(path.join(outDir, 'shanono_sumaila_takai_tarauni_tofa_tsanyawa_tudun_wada_ready_import.json'), JSON.stringify(report.lgas, null, 2));
} else {
  const outDir = path.join(__dirname);
  fs.writeFileSync(path.join(outDir, 'shanono_sumaila_takai_tarauni_tofa_tsanyawa_tudun_wada_validation_report.json'), JSON.stringify(report, null, 2));
}

console.log('Validation complete. Import blocked until complete community data is available.');
console.log(`LGAs Added: ${report.lgas_added}`);
console.log(`Communities Imported: ${report.communities_imported}`);
console.log(`Duplicate LGAs: ${report.duplicate_lgas.length}`);
console.log(`Duplicate Communities Removed: ${report.duplicate_communities_removed.length}`);
console.log(`Cross-LGA Duplicate Names: ${report.cross_lga_duplicate_names.length}`);
console.log(`Lookup Index Generated: ${report.lookup_index_generated}`);
console.log(`Wrong-LGA Records: ${report.wrong_lga_records_found.length}`);
console.log(`Validation Passed: ${report.validation_passed}`);

process.exit(report.validation_passed ? 0 : 2);
