import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define global.DOMMatrix BEFORE importing pdf-parse
if (!global.DOMMatrix) {
    global.DOMMatrix = class DOMMatrix {
        constructor(init) {
            this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
            if (Array.isArray(init)) {
                this.a = init[0] ?? 1;
                this.b = init[1] ?? 0;
                this.c = init[2] ?? 0;
                this.d = init[3] ?? 1;
                this.e = init[4] ?? 0;
                this.f = init[5] ?? 0;
            }
        }
    };
}

const run = async () => {
    const pdfPath = path.join(__dirname, "../../docs/kedco/KEDCO_MYTO_December_2025.pdf");
    const outPath = path.join(__dirname, "../../docs/extracted_pdf.txt");

    if (!fs.existsSync(pdfPath)) {
        console.error("PDF not found at:", pdfPath);
        process.exit(1);
    }

    console.log("Reading PDF...");
    try {
        const fileUrl = pathToFileURL(pdfPath).href;
        console.log(`Dynamically importing pdf-parse...`);
        const { PDFParse } = await import("pdf-parse");

        console.log(`Instantiating PDFParse with URL: ${fileUrl}...`);
        const parser = new PDFParse({ url: fileUrl });
        console.log("Extracting text...");
        const result = await parser.getText();
        console.log("Text extracted. Saving to file...");
        fs.writeFileSync(outPath, result.text, "utf8");
        console.log("Extracted text saved to:", outPath);
        await parser.destroy();
        process.exit(0);
    } catch (err) {
        console.error("Failed to parse PDF:", err);
        process.exit(1);
    }
};

run();
