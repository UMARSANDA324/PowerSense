import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const run = () => {
    const textPath = path.join(__dirname, "../docs/extracted_pdf.txt");
    const content = fs.readFileSync(textPath, "utf8");
    const lines = content.split("\n");

    let count = 0;
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith("--") || trimmed.includes("Supplementary Order") || trimmed.includes("Service Band")) {
            continue;
        }

        const parts = trimmed.split("\t").map(p => p.trim());
        const serial = parseInt(parts[0]);
        if (isNaN(serial)) continue;

        console.log(`Line ${serial}: length=${parts.length}`);
        parts.forEach((p, i) => {
            console.log(`  Col ${i}: "${p}"`);
        });

        count++;
        if (count >= 15) break;
    }
};

run();
