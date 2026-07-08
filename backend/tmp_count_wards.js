import fs from 'fs';
const content = fs.readFileSync('scripts/importKanoWards.js', 'utf8');
const match = content.match(/const KANO_WARDS_DATA = \{([\s\S]*?)\};/m);
if (!match) {
  console.error('KANO_WARDS_DATA block not found');
  process.exit(1);
}
const dataText = match[1];
const entries = dataText.split(/\n(?=\s*"[^"]+": \[)/g);
for (const entry of entries) {
  const headerMatch = entry.match(/\s*"([^"]+)": \[/);
  if (!headerMatch) continue;
  const lga = headerMatch[1];
  const lines = entry.split('\n');
  const count = lines.filter(line => line.trim().startsWith('"')).length;
  console.log(`${lga}: ${count}`);
}
