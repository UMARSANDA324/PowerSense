import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import State from '../models/Location/State.js';
import LGA from '../models/Location/LGA.js';
import Ward from '../models/Location/Ward.js';
import { slugify, buildAreaStableId } from '../utils/slugGenerator.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Final batch data (exact names preserved)
const BATCH = [
  {
    lga: 'Ungogo',
    lga_id: 'lga_ungogo',
    communities: [
      'Adaraye','Alhrani','Amar Zakawa','Bacirawa','Bagujan','Ciromawa','Dankunkuru','Dausayi','Doka','Dorayi','Fanisau','Garinlya','Gayawa','Gera','Hoto','Indabo','Inkyan','Inusawa Babba','Inusawa Karawa','Jajira','Kadawa','Kakurun','Kanawa','Kansuwa','Kantsi','Karo','Kauranchi','Kawari','Kera','Koranci','Kududu Fawa','Kwajalawa','Kyaran','Malamawa','Mushuni','Rafin Mallam','Rangaza','Rijiyar Dinya','Rijiyar Zaki','Rimi','Rimi Gata','Rimi Zakara','Sabon Gari','Tarda','Tudun Fulani','Umasawa','Wachani','Watari','Wujanare','Yada Kunya','Yan Ali','Yanmata','Yola','Z/Babba','Zango','Zaura Dan Baba','Zikaya'
    ]
  },
  {
    lga: 'Warawa',
    lga_id: 'lga_warawa',
    communities: [
      "A'Giwa","Madarin","Amarawa","Manyan Mata","Dan Lasan","Tamburawa Gabas","Galadima","Token","Ganakako","Wambantu","Garu Dau","Warawa","Giwarwan","Warkai","Goget","Yan-Dalla","Gumaka","Yan-Tofa","Jigawa","Yangizo","Kanta","Kanwa","Katarkawa","Kinchau","Ladimakole","Limawa"
    ]
  },
  {
    lga: 'Wudil',
    lga_id: 'lga_wudil',
    communities: [
      'Unguwar Fulani','Abuja','Aliyu Dan Darman Rd.','Dafawa','Kofar Kara','Medical Health Department','NYSC Office','Special Primary School','Weekly Market','Sabon Gari','Alhaji Salihu Sarki St.','Gidan Kuka Rd.','Maiduguri Rd.','Sabon Gari Junior Secondary School','Yan Goro','Juma Rd.','Area Court','Gaya Rd.','Gidan Biski Rd.','Hanyar Farin Gida','INEC Office','Liberty Hotel','Markatar Abba St.','Washo Rd.','Kofar Fada','Gaban Komi','Islamiyya School','Kan Karofi','Kofar Yamma','Kukar Dabi','Layin Alhaji Abba','Mahauta','Model Secondary School','Police Station','Tropical Commercial','Bank','Tsohuwar Kasuwa','Unguwar Koko','Women Center','Wudil L.G. Education Dept.','Zango','Kano State University','Cattle Market','Weekly Motor Part','Wudil Comprehensive Health','Health','Bauchi Yal.','Fadi Sonka Rd.','G.G. Quarters Rd.','Gachi','Local Government Quarters','Rehabilitation Centre','Total Petrol','Wudil Company Health','Local Government Secretariat','Dugaji Oil','Iyar Sarki','KASCO','Ministry of Education Zonal Office','Unbulu','Garindo','Garindo Village','Polac','WRECA','Police Barracks','Police','Post Office','NITEL Office Barracks','Jigawa','Indabo Rd.','Juma Rd.','Katurje','Jumar Dan Padal','Shagari Quarters','Sakau','Shagari Quarters A','State Primary Education Board','Wudil (Rural Communities)','Achika','Audaga','Bange','Buda','Dagumawa','Dal','Darki','Gariko','Garin Ali','Guna','Gware','Indabo','Juma','Kafin Malami','Kausani','Kawo','Kwas','Lajawa','Maida','Makadi','Makera','Mandawari','Raba','Tsakuwadal','Utai','Wudil','Yarka'
    ]
  }
];

const normalizeNameRemovePostcode = (s) => {
  if (!s || typeof s !== 'string') return '';
  // remove tokens that are pure 3-6 digits anywhere
  return s.split(/\s+/).filter(t => !/^\d{3,6}$/.test(t)).join(' ').trim();
};

const normalizeLookupKey = (s) => {
  if (!s) return '';
  return String(s)
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[-\s]/g, '')
    .normalize('NFKD')
    .replace(/[^a-z0-9]/g, '');
};

const buildCommunityId = (lgaName, communitySlug) => {
  // community_kano_<lga>_<slug> using underscores
  const lgaToken = String(lgaName).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const slugToken = communitySlug.replace(/-/g, '_');
  return `community_kano_${lgaToken}_${slugToken}`;
};

const report = {
  metadata: { generated_at: new Date().toISOString() },
  added: 0,
  duplicates_removed: 0,
  spelling_corrections: 0,
  lga_corrections: [],
  problems: [],
  added_list: []
};

const main = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MongoDB URI missing in .env. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const state = await State.findOne({ name: 'Kano' });
  if (!state) {
    console.error('Kano state not found in DB. Aborting.');
    process.exit(1);
  }

  // Load or initialize lookup
  const lookupPath = path.join(__dirname, 'communityLookup.json');
  let lookup = {};
  if (fs.existsSync(lookupPath)) {
    try { lookup = JSON.parse(fs.readFileSync(lookupPath, 'utf8')); } catch (e) { lookup = {}; }
  }

  for (const batchLga of BATCH) {
    const lgaName = batchLga.lga;
    const lgaDoc = await LGA.findOne({ name: lgaName, state: state._id });
    if (!lgaDoc) {
      report.problems.push({ type: 'missing_lga', lga: lgaName, message: 'LGA not found in database; skipping append' });
      continue;
    }

    // Process each community
    for (let raw of batchLga.communities) {
      const cleaned = normalizeNameRemovePostcode(raw);
      if (!cleaned) {
        report.problems.push({ type: 'empty_name_after_clean', lga: lgaName, raw });
        continue;
      }

      // preserve original display name exactly (per requirements)
      const displayName = cleaned;

      // Check duplicate name in same LGA
      const existingSame = await Ward.findOne({ name: displayName, lga: lgaDoc._id });
      if (existingSame) {
        report.duplicates_removed += 1;
        continue; // do not add duplicate
      }

      // Check if this name exists elsewhere in DB
      const existingElsewhere = await Ward.find({ name: displayName }).populate('lga');
      if (existingElsewhere && existingElsewhere.length > 0) {
        // record, but allowed
        report.lga_corrections.push({ community: displayName, found_in: existingElsewhere.map(e => ({ lga: e.lgaName || e.lga?.name || 'UNKNOWN', id: e.id })) });
      }

      // Build slug using existing slugify
      let slug = slugify(displayName);
      // ensure slug is unique within LGA; Ward schema enforces lga+slug unique
      let slugCandidate = slug;
      let suffix = 1;
      while (await Ward.findOne({ lga: lgaDoc._id, slug: slugCandidate })) {
        suffix += 1;
        slugCandidate = `${slug}-${suffix}`;
      }
      slug = slugCandidate;

      // Build IDs
      const commId = buildCommunityId(lgaName, slug);
      // ensure id unique globally
      if (await Ward.findOne({ id: commId })) {
        report.problems.push({ type: 'duplicate_id', id: commId, community: displayName, lga: lgaName });
        continue;
      }

      // areaId - use existing project stable pattern
      const areaId = buildAreaStableId(state.name, lgaName, displayName);
      if (await Ward.findOne({ areaId })) {
        // collision - report and skip
        report.problems.push({ type: 'duplicate_areaId', areaId, community: displayName, lga: lgaName });
        continue;
      }

      // Build document
      const doc = {
        name: displayName,
        id: commId,
        wardName: displayName,
        areaId,
        slug,
        lga: lgaDoc._id,
        lgaId: lgaDoc.lgaId || batchLga.lga_id,
        lgaName: lgaDoc.name,
        state: state._id,
        country: 'Nigeria',
        aliases: [],
        latitude: null,
        longitude: null,
        coordinates: null,
        isUrban: true,
        status: 'active',
        feederIds: []
      };

      // Insert
      try {
        const created = await Ward.create(doc);
        report.added += 1;
        report.added_list.push({ id: created.id, name: created.name, lga: lgaDoc.name });

        // Update lookup: map normalized keys for name and slug and aliases
        const keys = new Set();
        keys.add(normalizeLookupKey(created.name));
        keys.add(normalizeLookupKey(created.slug));
        for (const a of (created.aliases || [])) keys.add(normalizeLookupKey(a));

        for (const k of keys) {
          if (!k) continue;
          lookup[k] = lookup[k] || [];
          // avoid duplicates in lookup
          if (!lookup[k].some(e => e.communityId === created.id)) {
            lookup[k].push({ lga: created.lgaName, communityId: created.id, slug: created.slug });
          }
        }

      } catch (err) {
        report.problems.push({ type: 'insert_error', community: displayName, lga: lgaName, message: err.message });
      }
    }
  }

  // sync indexes (rebuild indexes if needed)
  try {
    await Ward.syncIndexes();
  } catch (e) {
    // non-fatal but report
    report.problems.push({ type: 'sync_indexes_failed', message: e.message });
  }

  // write lookup back
  try {
    fs.writeFileSync(path.join(__dirname, 'communityLookup.json'), JSON.stringify(lookup, null, 2));
  } catch (e) {
    report.problems.push({ type: 'write_lookup_failed', message: e.message });
  }

  await mongoose.disconnect();

  // Print summary
  console.log('Append final batch complete. Summary:');
  console.log(`Communities added: ${report.added}`);
  console.log(`Duplicates skipped (existing in same LGA): ${report.duplicates_removed}`);
  console.log(`Spelling corrections made: ${report.spelling_corrections}`);
  console.log('Any LGA-assignment observations:');
  console.log(JSON.stringify(report.lga_corrections.slice(0,20), null, 2));
  if (report.problems.length) {
    console.log('Problems encountered (first 20):');
    console.log(JSON.stringify(report.problems.slice(0,20), null, 2));
  }

  // write report
  fs.writeFileSync(path.join(__dirname, 'append_final_kano_report.json'), JSON.stringify(report, null, 2));
  process.exit(0);
};

main().catch(err => { console.error('Fatal error:', err); process.exit(1); });
