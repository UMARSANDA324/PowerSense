import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const run = () => {
    const textPath = path.join(__dirname, "../docs/extracted_pdf.txt");
    if (!fs.existsSync(textPath)) {
        console.error("Text file not found");
        process.exit(1);
    }

    const content = fs.readFileSync(textPath, "utf8");
    const lines = content.split("\n");

    const substations = new Set();
    const records = [];

    // Pattern to parse lines like:
    // 1 A 	11KV AHMADU BELLO 	CLUB INJECTION SUBSTATION 	AHMADU BELLO WAYAND MURTALA MUHD WAY KANO 	20
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Skip pages headers or page numbers
        if (trimmed.startsWith("--") || trimmed.includes("Supplementary Order") || trimmed.includes("Service Band")) {
            continue;
        }

        // We split by tab
        const parts = trimmed.split("\t").map(p => p.trim());
        if (parts.length < 3) continue;

        // Check if first part is a number (serial number)
        const serial = parseInt(parts[0]);
        if (isNaN(serial)) continue;

        // Try to identify substation column.
        // Let's print out parts to understand layout
        records.push({ line: trimmed, parts });

        // Usually:
        // parts[0] = serial
        // parts[1] = Band (A, B, C, etc.)
        // parts[2] = Feeder (e.g., 11KV AHMADU BELLO)
        // parts[3] = Substation (e.g., CLUB INJECTION SUBSTATION)
        // parts[4] = Service Area
        // parts[5] = Hours
        // But sometimes columns are merged or parsed differently. Let's check.
        let sub = "";
        if (parts.length >= 4) {
            // Check if parts[3] contains "SUBSTATION", "SUSTATION", "TS", or similar
            sub = parts[3];
        }
        
        if (sub) {
            substations.add(sub);
        }
    }

    console.log(`Total parsed records: ${records.length}`);
    console.log(`Unique substations count: ${substations.size}`);
    console.log("Unique substations:");
    Array.from(substations).sort().forEach((s, idx) => {
        console.log(`${idx + 1}. ${s}`);
    });
};

run();
