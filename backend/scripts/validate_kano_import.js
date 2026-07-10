import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source data: LGAs and communities provided for validation (original names preserved)
const source = [
  {
    lga_name: 'Madobi',
    lga_id: 'lga_madobi',
    communities: [
      'Abarchi','Agalawa','Bakinkogi','Burji','Chiinkoso','Daburau','Dan Maryame','Dan’auta','Danzo Gari','Gazana','Gora','Kafin Agur','Kanwa','Kaura Mata','Kubarachi','Kundurum','Kwankwaso','Madobi','Ningawa','Rikadawa','Ruga','Yakun'
    ]
  },
  {
    lga_name: 'Makoda',
    lga_id: 'lga_makoda',
    communities: [
      'Bakarari','Chidari','Danya','Dunawa','Ganji','Jibya','Koguna','Mai-Unguwa','Maitse Dau','Nakarari','Sabon Ruwa','Tabo','Tangaji','Yamawa','Zago'
    ]
  },
  {
    lga_name: 'Minjibir',
    lga_id: 'lga_minjibir',
    communities: [
      'Abudakawa','Agalawa','Agarandawa','Azore','Bagurawa','Beguwa','Damusawa','Dauni','Daurawa','Dingin','Dukawa','Dukuji','Dumawa','Farawa','Farke','Gandirwawa','Garke','Gasgainu','Gawo','Gezagezawa','Goda','Gurjiya','Gyaranya','Jamaare','Kankarawa','Kantama Baba','Kazawa','Koya','Kuchir Chiwa','Kukana','Kunya','Kurma','Kuro','Kuru','Kwarkiya','Ladan','Madawa','Magarawa','Marke','Minjibir','Runfa','Sanbaluna','Sarbl','Shagen','Tsage','Tsakuwa','Tsankiya','Tunkunawa','Wakamawa','Wasai','Yabawa','Yajin Rana','Yargaya','Yola','Yukana','Z/Dangwali','Zabainawar','Zango','Zura'
    ]
  },
  {
    lga_name: 'Nasarawa',
    lga_id: 'lga_nasarawa',
    communities: [
      'Aduwa Rd.','Balawa Cr.','Bompai Police Barracks','Bompia Industrial Estate','Bompia Rd.','CASRS','Club Rd.','Danbata Rd.','Hadejia Rd.','Hausa Rd.','Kundila Rd.','Maganda Rd.','Mundabawa Av.','Murtala Muhammed Rd.','President Av.','Sabon Gari Stadium','St. Thomas','Sule Gaya Rd.','Tafawa Balewa Rd.','Tudun Wada','Umaru Babura Rd.','Whaff Rd.','Zaria Av.'
    ]
  }
];

// Helpers
const sanitizeForId = (s) => {
  if (!s || typeof s !== 'string') return '';
  // Remove common postcode-like tokens (pure digits of length 3-6)
  const tokens = s.split(/\s+/).filter(t => !/^\d{3,6}$/.test(t));
  let name = tokens.join(' ');
  // remove punctuation except underscore and dash (we'll remove dash too per rules)
  name = name.replace(/[\u2019']/g, ''); // remove special apostrophes
  name = name.normalize('NFKD').replace(/[^\w\s-\/]/g, '');
  // replace slashes with underscore
  name = name.replace(/[\/\-]/g, ' ');
  name = name.trim().toLowerCase().replace(/\s+/g, '_');
  // remove any characters not alphanumeric or underscore
  name = name.replace(/[^a-z0-9_]/g, '');
  return name;
};

const makeCommunityId = (lgaId, communityName) => {
  const c = sanitizeForId(communityName);
  return `${lgaId.replace(/^lga_/, 'lga_')}_${c}`;
};

// Validation structures
const report = {
  metadata: { generated_at: new Date().toISOString() },
  lgas_added: 0,
  communities_imported: 0,
  duplicate_lgas: [],
  duplicate_communities_removed: [],
  wrong_lga_records_found: [], // requires external verification
  malformed_ids: [],
  validation_errors: [],
  validation_passed: false
};

const idSet = new Set();
const lgaNameSet = new Set();

const transformed = [];

for (const lga of source) {
  if (lgaNameSet.has(lga.lga_name.toLowerCase())) {
    report.duplicate_lgas.push(lga.lga_name);
  }
  lgaNameSet.add(lga.lga_name.toLowerCase());
  report.lgas_added += 1;

  const seenCommunityNames = new Set();
  const communitiesOut = [];

  for (const origName of lga.communities) {
    if (!origName || String(origName).trim() === '') {
      report.validation_errors.push({ type: 'empty_name', lga: lga.lga_name, name: origName });
      continue;
    }

    // detect duplicates within same LGA (case-insensitive exact match)
    const lc = origName.trim().toLowerCase();
    if (seenCommunityNames.has(lc)) {
      report.duplicate_communities_removed.push({ lga: lga.lga_name, community: origName });
      continue; // keep only one
    }
    seenCommunityNames.add(lc);

    const cid = makeCommunityId(lga.lga_id, origName);
    if (idSet.has(cid)) {
      report.malformed_ids.push({ issue: 'duplicate_id', id: cid, lga: lga.lga_name, community: origName });
    }
    idSet.add(cid);

    // check id format
    if (!/^[a-z0-9_]+$/.test(cid)) {
      report.malformed_ids.push({ issue: 'malformed_id', id: cid, lga: lga.lga_name, community: origName });
    }

    const communityObj = {
      id: cid,
      original_name: origName,
      name: origName,
      lga_id: lga.lga_id,
      latitude: null,
      longitude: null
    };

    communitiesOut.push(communityObj);
  }

  transformed.push({ lga_name: lga.lga_name, lga_id: lga.lga_id, communities: communitiesOut });
  report.communities_imported += communitiesOut.length;
}

// Detect duplicate community names across LGAs (allowed) and report occurrences
const crossMap = {};
for (const l of transformed) {
  for (const c of l.communities) {
    const key = c.original_name.trim().toLowerCase();
    crossMap[key] = crossMap[key] || [];
    crossMap[key].push({ lga: l.lga_name, id: c.id });
  }
}

const duplicateCommunitiesAcrossLgas = Object.entries(crossMap).filter(([, arr]) => arr.length > 1).map(([name, arr]) => ({ name, occurrences: arr }));

// Prepare final health checks
if (report.malformed_ids.length > 0) report.validation_errors.push({ type: 'malformed_ids', details: report.malformed_ids });
if (report.duplicate_lgas.length > 0) report.validation_errors.push({ type: 'duplicate_lgas', details: report.duplicate_lgas });

// At this stage we can run all internal checks, but LGA membership verification requires authoritative external sources.
// We'll mark membership_verified false and list all communities needing manual/external verification.
const membershipVerificationNeeded = [];
for (const l of transformed) {
  for (const c of l.communities) {
    membershipVerificationNeeded.push({ community: c.original_name, lga: l.lga_name, community_id: c.id });
  }
}

report.wrong_lga_records_found = []; // none automatically moved or reassigned
report.membership_verification_needed = membershipVerificationNeeded;
report.duplicate_communities_across_lgas = duplicateCommunitiesAcrossLgas;

// Final validation pass: only true if no validation_errors and membership verification completed.
report.validation_passed = (report.validation_errors.length === 0) && (report.membership_verification_needed.length === 0);

// Output files (do not modify DB)
const outDir = path.join(__dirname);
fs.writeFileSync(path.join(outDir, 'ready_import.json'), JSON.stringify(transformed, null, 2));
fs.writeFileSync(path.join(outDir, 'validation_report.json'), JSON.stringify(report, null, 2));

console.log('Validation complete. Report written to backend/scripts/validation_report.json');
console.log('Prepared import JSON written to backend/scripts/ready_import.json (do not commit/import until manual membership verification completes)');
console.log(`LGAs Added: ${report.lgas_added}`);
console.log(`Communities Imported (after removing intra-LGA duplicates): ${report.communities_imported}`);
console.log(`Duplicate LGAs: ${report.duplicate_lgas.length}`);
console.log(`Duplicate Communities Removed: ${report.duplicate_communities_removed.length}`);
console.log(`Wrong-LGA Records Found (auto-detected): ${report.wrong_lga_records_found.length}`);
console.log(`Malformed IDs: ${report.malformed_ids.length}`);
console.log(`Membership verifications needed: ${report.membership_verification_needed.length}`);
console.log(`Validation Passed: ${report.validation_passed}`);

process.exit(report.validation_passed ? 0 : 2);
