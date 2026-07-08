import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BANNED_AREAS = [
  'KATSINA', 'JIGAWA', 'DAURA', 'FUNTUA', 'MUSAWA', 'KAZAURE', 
  'KANKIA', 'DUTSE', 'HADEJIA', 'BIRNIN KUDU', 'MALUMFASHI'
];

const run = () => {
    const textPath = path.join(__dirname, "../docs/extracted_pdf.txt");
    const content = fs.readFileSync(textPath, "utf8");
    const lines = content.split("\n");

    const allSubs = new Set();
    const kanoSubs = new Set();
    const nonKanoSubs = new Set();

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith("--") || trimmed.includes("Supplementary Order") || trimmed.includes("Service Band")) {
            continue;
        }

        const parts = trimmed.split("\t").map(p => p.trim());
        
        // Find serial number to check if it's a data line
        let snPart = parts[0];
        let sn = parseInt(snPart);
        if (isNaN(sn)) {
            // Check if parts[0] starts with a number like "13 A 11KV..."
            const match = snPart.match(/^(\d+)\s+/);
            if (match) {
                sn = parseInt(match[1]);
            } else {
                continue;
            }
        }

        // Find the substation column
        let sub = "";
        if (parts.length === 5) {
            sub = parts[2];
        } else if (parts.length === 4) {
            sub = parts[1];
        } else {
            // fallback: find the part containing INJECTION SUBSTATION, SUSTATION, SUB STATION or TS
            for (const p of parts) {
                if (p.includes("INJECTION") || p.includes("SUSTATION") || p.includes("SUB STATION") || p.endsWith(" TS") || p.endsWith(" TS ")) {
                    sub = p;
                    break;
                }
            }
        }

        if (sub) {
            sub = sub.trim();
            // clean up common variations
            let cleanSub = sub
                .replace(/\s+/g, " ")
                .replace("INJECTION SUSTATION", "INJECTION SUBSTATION")
                .replace("INJECTION SUB-STATION", "INJECTION SUBSTATION")
                .replace("INJECTION SUB STATION", "INJECTION SUBSTATION")
                .trim();
            
            if (cleanSub) {
                allSubs.add(cleanSub);

                // Check if the service area or feeder name or substation name contains any banned (non-Kano) terms
                const lineUpper = trimmed.toUpperCase();
                const isNonKano = BANNED_AREAS.some(area => lineUpper.includes(area));
                if (isNonKano) {
                    nonKanoSubs.add(cleanSub);
                } else {
                    kanoSubs.add(cleanSub);
                }
            }
        }
    }

    console.log(`Total unique substations (all): ${allSubs.size}`);
    console.log(`Total unique Kano substations: ${kanoSubs.size}`);
    console.log(`Total unique non-Kano substations: ${nonKanoSubs.size}`);

    console.log("\nKano Substations:");
    Array.from(kanoSubs).sort().forEach((s, i) => console.log(`  ${i+1}. ${s}`));

    console.log("\nNon-Kano Substations:");
    Array.from(nonKanoSubs).sort().forEach((s, i) => console.log(`  ${i+1}. ${s}`));
};

run();
