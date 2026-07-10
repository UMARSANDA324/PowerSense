import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataset = [
  {
    lga_name: 'Rano',
    lga_id: 'lga_rano',
    communities: [
      'Barnawa',
      'Burum',
      'Dususu',
      'Faran',
      'Fassi',
      'Fiyaran',
      'Gorabi',
      'Jellorawa',
      'Juma',
      'Kaiwa',
      'Kalambu',
      'Kundun',
      'Kunkura',
      'Lafsu',
      'Madaci',
      'Mashe',
      'Rano',
      'Rurum',
      'Saji',
      'Sanda',
      'Shike',
      'Tofa',
      'Torankawa',
      'Tsaure',
      'Tum',
      'Yado',
      'Yalwa',
      'Yankanchi',
      'Zambur',
      'Zanyau',
      'Zurgu'
    ]
  },
  {
    lga_name: 'Rimin Gado',
    lga_id: 'lga_rimin_gado',
    communities: [
      'Butubutu',
      'D/Gulu',
      'Dan Isa',
      'Gulu',
      'Indabo',
      'Janguza',
      'Jili',
      'Juli',
      'Karofi Yashi',
      'Maigari',
      'Rimin Gado',
      'Rinji',
      'Sakaratsa',
      'Tamawa',
      'Tuji',
      'Ungwan Rimi',
      'Wangara',
      'Yalwa',
      'Yan Kuni',
      'Yango'
    ]
  },
  {
    lga_name: 'Rogo',
    lga_id: 'lga_rogo',
    communities: [
      'Bari',
      'Beli',
      'Dan Sambo',
      'Dederi',
      'Falgore',
      'Fulatan',
      'Gidanjaro',
      'Gwan Gwan',
      'Kadafa',
      'Kadana',
      'Makwanyawa',
      'Nasarawa',
      'Rogo',
      'Ruwanbago',
      'Tsohuwar/Rogo',
      'Uguwar Sundu',
      'Ung. Makera',
      'Yammali',
      'Zamfarawa',
      'Zarewa'
    ]
  }
];

function normalizeDisplayName(rawName) {
  if (typeof rawName !== 'string') return '';
  const trimmed = rawName.trim();
  if (!trimmed) return '';
  return trimmed.replace(/\s+\d{3,6}\s*$/g, '').trim();
}

function buildStableId(text) {
  if (typeof text !== 'string') return '';
  const normalized = text
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s-]+/g, ' ')
    .trim()
    .toLowerCase();
  return normalized.replace(/\s+/g, '_');
}

function ensureCommunityId(lgaName, communityName) {
  const lgaSlug = buildStableId(lgaName);
  const communitySlug = buildStableId(communityName);
  return `${lgaSlug}_${communitySlug}`;
}

const report = {
  metadata: {
    generated_at: new Date().toISOString(),
    source: 'manual_validation_only',
    import_blocked: true
  },
  lgas_added: 0,
  communities_imported: 0,
  duplicate_lgas: [],
  duplicate_communities_removed: [],
  wrong_lga_records_found: [],
  invalid_records: [],
  missing_ids: [],
  validation_errors: [],
  manual_review_required: [],
  dataset_validation: 'FAILED',
  validation_passed: false,
  lgas: []
};

const seenLgaNames = new Set();
const seenCommunityIds = new Set();
const seenCommunityNamesByLga = new Map();

for (const lga of dataset) {
  const lgaName = normalizeDisplayName(lga.lga_name);
  if (!lgaName) {
    report.invalid_records.push({ type: 'empty_lga_name', lga: lga.lga_name });
    report.validation_errors.push({ type: 'empty_lga_name', lga: lga.lga_name });
    continue;
  }

  if (seenLgaNames.has(lgaName.toLowerCase())) {
    report.duplicate_lgas.push(lgaName);
    report.validation_errors.push({ type: 'duplicate_lga', lga: lgaName });
  }
  seenLgaNames.add(lgaName.toLowerCase());

  report.lgas_added += 1;

  const communities = [];
  const seenCommunityNames = new Set();
  const lgaCommunityNames = [];

  for (const rawCommunity of lga.communities) {
    const displayName = normalizeDisplayName(rawCommunity);
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

    const communityId = ensureCommunityId(lgaName, displayName);
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

    communities.push({
      original_name: rawCommunity,
      name: displayName,
      id: communityId,
      lga_id: lga.lga_id,
      latitude: null,
      longitude: null
    });

    lgaCommunityNames.push(displayName);
  }

  communities.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  report.communities_imported += communities.length;
  report.lgas.push({
    lga_name: lgaName,
    lga_id: lga.lga_id,
    communities
  });

  seenCommunityNamesByLga.set(lgaName, lgaCommunityNames);
}

for (const lgaEntry of report.lgas) {
  for (const community of lgaEntry.communities) {
    report.manual_review_required.push({
      community: community.name,
      current_lga: lgaEntry.lga_name,
      suggested_lga: 'requires_authoritative_source',
      reason: 'Manual LGA membership verification required before import',
      confidence: 'pending'
    });
  }
}

report.validation_errors = report.validation_errors.filter((item, index, arr) => JSON.stringify(arr.slice(0, index)).indexOf(JSON.stringify(item)) === -1);
report.validation_passed = report.duplicate_lgas.length === 0 && report.invalid_records.length === 0 && report.missing_ids.length === 0 && report.validation_errors.filter((e) => ['duplicate_community_id', 'duplicate_community_within_lga', 'duplicate_lga', 'empty_community_name', 'empty_lga_name', 'missing_id'].includes(e.type)).length === 0 && report.manual_review_required.length === 0;
report.dataset_validation = report.validation_passed ? 'PASSED' : 'FAILED';

const outDir = path.join(__dirname);
fs.writeFileSync(path.join(outDir, 'rano_rimin_rogo_ready_import.json'), JSON.stringify(report.lgas, null, 2));
fs.writeFileSync(path.join(outDir, 'rano_rimin_rogo_validation_report.json'), JSON.stringify(report, null, 2));

console.log('Validation complete. Import blocked until manual verification is completed.');
console.log(`LGAs Added: ${report.lgas_added}`);
console.log(`Communities Imported: ${report.communities_imported}`);
console.log(`Duplicate LGAs: ${report.duplicate_lgas.length}`);
console.log(`Duplicate Communities Removed: ${report.duplicate_communities_removed.length}`);
console.log(`Wrong-LGA Records Found: ${report.wrong_lga_records_found.length}`);
console.log(`Invalid Records: ${report.invalid_records.length}`);
console.log(`Missing IDs: ${report.missing_ids.length}`);
console.log(`Dataset Validation: ${report.dataset_validation}`);
console.log('Report written to backend/scripts/rano_rimin_rogo_validation_report.json');
console.log('Prepared import JSON written to backend/scripts/rano_rimin_rogo_ready_import.json');

process.exit(report.validation_passed ? 0 : 2);
