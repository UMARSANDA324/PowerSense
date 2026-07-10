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

const READY_IMPORT_FILE = path.join(__dirname, 'rano_rimin_rogo_ready_import.json');
const LOOKUP_FILE = path.join(__dirname, 'communityLookup.json');

const normalizeLookupKey = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]/g, '');
};

const ensureUniqueSlug = async (baseSlug, lgaId) => {
  let slug = baseSlug;
  let suffix = 1;
  let exists = await Ward.findOne({ slug, lga: lgaId });
  while (exists) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
    exists = await Ward.findOne({ slug, lga: lgaId });
  }
  return slug;
};

const loadJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf-8'));

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const state = await State.findOne({ name: 'Kano' });
  if (!state) {
    console.error('Kano state not found');
    process.exit(1);
  }

  const readyImports = loadJson(READY_IMPORT_FILE);
  const lookup = loadJson(LOOKUP_FILE);

  const report = {
    lgasProcessed: 0,
    lgasSkipped: 0,
    wardsCreated: 0,
    wardsUpdated: 0,
    lookupEntriesAdded: 0,
    warnings: []
  };

  for (const entry of readyImports) {
    const lgaName = entry.lga_name?.trim();
    if (!lgaName) {
      report.warnings.push({ type: 'missing_lga_name', entry });
      continue;
    }

    const lga = await LGA.findOne({ name: lgaName, state: state._id });
    if (!lga) {
      report.warnings.push({ type: 'missing_existing_lga', lga: lgaName });
      report.lgasSkipped += 1;
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
    if (lga.status !== 'active') {
      lga.status = 'active';
      lgaChanged = true;
    }
    if (lga.isActive === false) {
      lga.isActive = true;
      lgaChanged = true;
    }

    if (lgaChanged) {
      await lga.save();
    }

    report.lgasProcessed += 1;

    for (const community of entry.communities || []) {
      const name = String(community.name || community.original_name || '').trim();
      if (!name) {
        report.warnings.push({ type: 'missing_community_name', lga: lgaName, community });
        continue;
      }

      const wardId = String(community.id || '').trim();
      if (!wardId) {
        report.warnings.push({ type: 'missing_community_id', lga: lgaName, community: name });
        continue;
      }

      const normalizedName = name;
      const baseSlug = buildAreaSlug(normalizedName);
      const slug = await ensureUniqueSlug(baseSlug, lga._id);
      const areaId = buildAreaStableId(state.name, lga.name, normalizedName);
      const lgaId = lga.lgaId || stableLgaId;

      let ward = await Ward.findOne({ id: wardId });
      if (!ward) {
        ward = await Ward.findOne({ name: normalizedName, lga: lga._id });
      }

      if (ward) {
        let updated = false;
        if (!ward.id) {
          ward.id = wardId;
          updated = true;
        } else if (ward.id !== wardId) {
          report.warnings.push({ type: 'ward_id_conflict', lga: lgaName, existingId: ward.id, incomingId: wardId, name: normalizedName });
        }
        if (!ward.slug || ward.slug !== slug) {
          ward.slug = slug;
          updated = true;
        }
        if (!ward.areaId || ward.areaId !== areaId) {
          ward.areaId = areaId;
          updated = true;
        }
        if (!ward.lgaId || ward.lgaId !== lgaId) {
          ward.lgaId = lgaId;
          updated = true;
        }
        if (!ward.lgaName || ward.lgaName !== lga.name) {
          ward.lgaName = lga.name;
          updated = true;
        }
        if (!ward.state || String(ward.state) !== String(state._id)) {
          ward.state = state._id;
          updated = true;
        }
        if (!ward.country) {
          ward.country = 'Nigeria';
          updated = true;
        }
        if (!Array.isArray(ward.aliases)) {
          ward.aliases = [];
          updated = true;
        }
        if (ward.latitude === undefined) {
          ward.latitude = null;
          updated = true;
        }
        if (ward.longitude === undefined) {
          ward.longitude = null;
          updated = true;
        }
        if (ward.coordinates === undefined) {
          ward.coordinates = null;
          updated = true;
        }
        if (!ward.status) {
          ward.status = 'active';
          updated = true;
        }
        if (ward.isUrban === undefined) {
          ward.isUrban = true;
          updated = true;
        }
        if (ward.isActive === false) {
          ward.isActive = true;
          updated = true;
        }
        if (updated) {
          await ward.save();
          report.wardsUpdated += 1;
        }
      } else {
        await Ward.create({
          name: normalizedName,
          wardName: normalizedName,
          id: wardId,
          areaId,
          slug,
          lga: lga._id,
          lgaId,
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
        report.wardsCreated += 1;
      }

      const key = normalizeLookupKey(normalizedName);
      if (!key) continue;
      if (!lookup[key]) {
        lookup[key] = [];
      }
      const alreadyExists = lookup[key].some((item) => item.communityId === wardId && item.lga === lga.name && item.slug === slug);
      if (!alreadyExists) {
        lookup[key].push({ lga: lga.name, communityId: wardId, slug });
        report.lookupEntriesAdded += 1;
      }
    }
  }

  fs.writeFileSync(LOOKUP_FILE, JSON.stringify(lookup, null, 2));
  console.log('Import complete. Summary:');
  console.log(JSON.stringify(report, null, 2));
  console.log(`Updated community lookup file: ${LOOKUP_FILE}`);

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('Import failed:', error);
  process.exit(1);
});