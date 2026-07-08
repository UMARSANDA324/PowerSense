import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const run = () => {
    const textPath = path.join(__dirname, "../docs/extracted_pdf.txt");
    const content = fs.readFileSync(textPath, "utf8");
    const lines = content.split("\n");

    const substations = new Set();
    const records = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith("--") || trimmed.includes("Supplementary Order") || trimmed.includes("Service Band")) {
            continue;
        }

        const parts = trimmed.split("\t").map(p => p.trim());
        
        let snPart = parts[0];
        let sn = parseInt(snPart);
        if (isNaN(sn)) {
            const match = snPart.match(/^(\d+)\s+/);
            if (match) {
                sn = parseInt(match[1]);
            } else {
                continue;
            }
        }

        let foundSub = "";
        for (const part of parts) {
            const upper = part.toUpperCase();
            if (upper.includes("INJECTION SUBSTATION") || 
                upper.includes("INJECTION SUSTATION") || 
                upper.includes("INJECTION SUB-STATION") || 
                upper.includes("SUB STATION") || 
                upper.endsWith(" TS") || 
                upper.endsWith(" TS ") || 
                upper.includes(" TS ")) {
                foundSub = part;
                break;
            }
        }

        if (foundSub) {
            // Clean up substation name
            let clean = foundSub
                .replace(/\s+/g, " ")
                .replace(/INJECTION SUSTATION/i, "INJECTION SUBSTATION")
                .replace(/INJECTION SUB-STATION/i, "INJECTION SUBSTATION")
                .replace(/INJECTION SUB STATION/i, "INJECTION SUBSTATION")
                .trim();
            substations.add(clean);
            records.push({ sn, line: trimmed, extracted: clean });
        } else {
            records.push({ sn, line: trimmed, extracted: null });
        }
    }

    console.log(`Unique substations count: ${substations.size}`);
    console.log("Unique substations:");
    Array.from(substations).sort().forEach((s, idx) => {
        console.log(`${idx + 1}. ${s}`);
    });

    console.log("\nLines with no substation extracted:");
    records.filter(r => !r.extracted).forEach(r => {
        console.log(`  SN ${r.sn}: "${r.line}"`);
    });
};

run();
