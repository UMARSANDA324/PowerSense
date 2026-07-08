import fs from 'fs';
import path from 'path';
const file = path.join(process.cwd(), 'scripts', 'communityLookup.json');
const lookup = JSON.parse(fs.readFileSync(file, 'utf8'));
const sample = ['hotoro','sharada','zariaroad','panshekara','gaida','kofar naisa','kano trade fare','bank road'];
for (const s of sample) {
  const norm = s.toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9]/g, '');
  console.log(`${s} => ${norm} => ${lookup[norm] ? lookup[norm].map(e => e.slug).slice(0,3).join(', ') : 'undefined'}`);
}
