if (!global.DOMMatrix) {
    global.DOMMatrix = class DOMMatrix {
        constructor(init) {
            this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
        }
    };
}
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

console.log("Prototype keys:", Object.getOwnPropertyNames(pdf.PDFParse.prototype));

// Let's test instantiating it with an empty object
try {
    const parser = new pdf.PDFParse({});
    console.log("Successfully instantiated with {}!");
    console.log("Parser instance properties:", Object.getOwnPropertyNames(parser));
    // Let's check what methods are available on prototype
    for (const key of Object.getOwnPropertyNames(pdf.PDFParse.prototype)) {
        console.log(` - Method/Prop: ${key} (${typeof pdf.PDFParse.prototype[key]})`);
    }
} catch (e) {
    console.log("Error:", e.message);
}
