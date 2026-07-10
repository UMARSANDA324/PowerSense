import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { slugify } from '../utils/slugGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MASTER_FILE = path.join(__dirname, '../data/kanoCommunities.json');
const LOOKUP_FILE = path.join(__dirname, 'communityLookup.json');
const OUT_DIR = path.join(__dirname, '..', 'data', 'kanoCommunities');

if (!fs.existsSync(MASTER_FILE)) {
  console.error('Master file not found:', MASTER_FILE);
  process.exit(1);
}

const master = JSON.parse(fs.readFileSync(MASTER_FILE, 'utf8'));
const lookup = fs.existsSync(LOOKUP_FILE) ? JSON.parse(fs.readFileSync(LOOKUP_FILE, 'utf8')) : {};

const lgaList = master.lgas.map(l => l.lga_name);

const ensureOut = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };
ensureOut(OUT_DIR);

const titleize = (s) => {
  if (!s) return s;
  s = s.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

// Build initial map from master
const lgaMap = new Map();
for (const lgaEntry of master.lgas || []) {
  const name = lgaEntry.lga_name;
  const set = new Set();
  for (const c of (lgaEntry.communities || [])) {
    if (c && c.name) set.add(c.name.trim());
  }
  lgaMap.set(name, set);
}

// Merge entries from lookup (group by lga)
for (const [key, entries] of Object.entries(lookup || {})) {
  for (const e of entries) {
    const lga = e.lga;
    if (!lga) continue;
    const set = lgaMap.get(lga) || new Set();
    // Derive a display name from key or slug
    let display = e.slug || key;
    display = display.replace(/\./g, '');
    display = titleize(display);
    set.add(display);
    lgaMap.set(lga, set);
  }
}

// Ensure all LGAs present (add empty sets if missing)
for (const lgaName of lgaList) {
  if (!lgaMap.has(lgaName)) lgaMap.set(lgaName, new Set());
}

// Write per-LGA files
for (const [lgaName, set] of lgaMap.entries()) {
  const communities = Array.from(set).sort((a, b) => a.localeCompare(b));
  const obj = {
    lga_name: lgaName,
    lga_id: `lga_${slugify(lgaName)}`,
    communities: communities.map(name => ({ name }))
  };
  const filename = path.join(OUT_DIR, `${slugify(lgaName)}.json`);
  fs.writeFileSync(filename, JSON.stringify(obj, null, 2), 'utf8');
  console.log('Wrote', filename, `(${communities.length} communities)`);
}

console.log('\nSplit complete. Per-LGA files are in:', OUT_DIR);
