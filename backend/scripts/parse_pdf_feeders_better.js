import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const run = () => {
  const textPath = path.join(__dirname, "../docs/extracted_pdf.txt");
  const content = fs.readFileSync(textPath, "utf8");
  const lines = content.split("\n");
  const BANNED_AREAS = ['KATSINA', 'JIGAWA', 'DAURA', 'FUNTUA', 'MUSAWA', 'KAZAURE', 'KANKIA', 'DUTSE', 'HADEJIA', 'BIRNIN KUDU', 'MALUMFASHI'];

  // All possible lines that have feeder data
  const feeders = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line || line.startsWith("--") || line.includes("Service Band") || line.includes("Supplementary Order")) continue;

    // Split by whitespace and filter out empty
    const parts = line.split(/\s+/);

    // Let's try to find lines that have a band (A,B,C,D,E) as second element
    if (parts.length >= 3) {
      // Check if second part is a single letter (A-E)
      const band = parts[1].toUpperCase();
      if (/^[ABCDE]$/.test(band)) {
        // Check if any part is voltage level (11KV, 33KV)
        let voltage = null;
        let voltageIndex = -1;
        for (let j = 0; j < parts.length; j++) {
          const part = parts[j].toUpperCase();
          if (part === "11KV" || part === "33KV") {
            voltage = part;
            voltageIndex = j;
            break;
          }
        }

        // Find substation name - look for terms like "INJECTION", "SUSTATION", "SUB STATION", "TS"
        let substationName = null;
        let subStart = -1;
        let subEnd = -1;

        for (let j = 0; j < parts.length; j++) {
          const part = parts[j].toUpperCase();
          if (part.includes("INJECTION") || part.includes("SUSTATION") || part.includes("TS")) {
            // Look backwards to find start of substation name
            for (let k = j - 1; k >= 0; k--) {
              const prevPart = parts[k];
              if (!isNaN(parseInt(prevPart))) break; // stop at number
              if (prevPart.toUpperCase() === "11KV" || prevPart.toUpperCase() === "33KV") break;
              if (prevPart.length === 1 && /^[ABCDE]$/.test(prevPart.toUpperCase())) break;
              subStart = k;
            }
            // Look forwards to find end
            subEnd = j;
            break;
          }
        }

        // Extract feeder name: between voltage (or index 2) and substation
        let feederNameParts = [];
        const startIndex = voltageIndex > -1 ? voltageIndex + 1 : 2;
        const endIndex = subStart > -1 ? subStart : parts.length - 1; // exclude the last number

        for (let j = startIndex; j < endIndex; j++) {
          if (parts[j]) feederNameParts.push(parts[j]);
        }

        const feederName = feederNameParts.join(" ").trim();
        if (feederName) {
          // Check if non-Kano
          const isNonKano = BANNED_AREAS.some(area => line.toUpperCase().includes(area));
          if (!isNonKano) {
            const subName = subStart > -1 ? parts.slice(subStart, subEnd + 1).join(" ") : null;
            feeders.push({
              lineNumber: i + 1,
              originalLine: line,
              band,
              voltage,
              feederName,
              substationName: subName
            });
          }
        }
      }
    }
  }

  console.log(`✅ Found ${feeders.length} feeders!`);
  console.log("\nSample feeders:");
  feeders.slice(0, 15).forEach(f => {
    console.log(`  [${f.band}] ${f.feederName} (${f.voltage || "?"}) → ${f.substationName || "?"}`);
  });
};

run();
