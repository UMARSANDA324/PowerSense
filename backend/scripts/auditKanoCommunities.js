import fs from "fs";
import path from "path";

const KANO_LGAS = [
    "Ajingi",
    "Albasu",
    "Bagwai",
    "Bebeji",
    "Bichi",
    "Bunkure",
    "Dala",
    "Dala Rural",
    "Danbatta",
    "Dawakin Kudu",
    "Dawakin Tofa",
    "Doguwa",
    "Fagge",
    "Gabasawa",
    "Garko",
    "Garum Mallam",
    "Gaya",
    "Gezawa",
    "Gwale",
    "Gwarzo",
    "Kabo",
    "Kano Municipal",
    "Karaye",
    "Kibiya",
    "Kiru",
    "Kumbotso",
    "Kunchi",
    "Kura",
    "Madobi",
    "Makoda",
    "Minjibir",
    "Nasarawa",
    "Rano",
    "Rimin Gado",
    "Rogo",
    "Shanono",
    "Sumaila",
    "Takai",
    "Tarauni",
    "Tofa",
    "Tsanyawa",
    "Tudun Wada",
    "Ungogo",
    "Warawa",
    "Wudil"
];

const dataPath = path.join(process.cwd(), "backend", "data", "kanoCommunities.json");

if (!fs.existsSync(dataPath)) {
    console.error("kanoCommunities.json not found at:", dataPath);
    process.exit(1);
}

const raw = fs.readFileSync(dataPath, "utf8");
let json;
try {
    json = JSON.parse(raw);
} catch (err) {
    console.error("Failed to parse JSON:", err.message);
    process.exit(1);
}

const lgaMap = new Map();
for (const lgaEntry of json.lgas || []) {
    lgaMap.set(lgaEntry.lga_name, (lgaEntry.communities || []).length);
}

const report = {
    totalExpectedLGAs: KANO_LGAS.length,
    totalInJson: (json.lgas || []).length,
    emptyLGAs: [],
    presentLGAs: [],
    missingInJson: []
};

for (const lga of KANO_LGAS) {
    if (!lgaMap.has(lga)) {
        report.missingInJson.push(lga);
        continue;
    }
    const count = lgaMap.get(lga);
    if (!count || count === 0) report.emptyLGAs.push(lga);
    else report.presentLGAs.push({ lga, count });
}

console.log("Kano Communities Audit Report");
console.log("================================");
console.log(`Expected LGAs: ${report.totalExpectedLGAs}`);
console.log(`LGAs in JSON: ${report.totalInJson}`);
console.log(`LGAs with communities: ${report.presentLGAs.length}`);
console.log(`LGAs empty: ${report.emptyLGAs.length}`);
console.log(`LGAs missing in JSON: ${report.missingInJson.length}`);

if (report.presentLGAs.length) {
    console.log("\nSample counts for populated LGAs:");
    for (const p of report.presentLGAs.sort((a,b)=>b.count-a.count).slice(0,20)) {
        console.log(` - ${p.lga}: ${p.count}`);
    }
}

if (report.emptyLGAs.length) {
    console.log("\nEmpty LGAs:");
    for (const l of report.emptyLGAs) console.log(` - ${l}`);
}

if (report.missingInJson.length) {
    console.log("\nMissing LGAs in kanoCommunities.json:");
    for (const l of report.missingInJson) console.log(` - ${l}`);
}

process.exit(0);
