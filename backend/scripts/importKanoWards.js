import mongoose from "mongoose";
import dotenv from "dotenv";
import LGA from "../models/Location/LGA.js";
import Ward from "../models/Location/Ward.js";
import State from "../models/Location/State.js";
import { buildAreaSlug, buildAreaStableId, buildLGAStableId } from "../utils/slugGenerator.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const ensureUniqueSlug = async (baseSlug, lgaId) => {
    let slug = baseSlug;
    let suffix = 1;
    const query = { slug, lga: lgaId };

    while (await Ward.findOne(query)) {
        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
        query.slug = slug;
    }
    return slug;
};

/**
 * WARD DATA FOR KANO STATE LGAs
 * Format: LGA Name → Array of Ward Names (postcodes removed, spaces trimmed)
 * Phase 1: Ajingi (20), Albasu (22)
 * Phase 2: Bagwai (23), Bebeji (21), Bichi (42), Bunkure (27)
 * Phase 3: Dala (86), Dala Rural (13), Danbatta (32), Dawakin Kudu (33), Dawakin Tofa (26), Doguwa (38)
 */
const KANO_WARDS_DATA = {
    "Ajingi": [
        "Ajingi",
        "Balare",
        "Chula",
        "Dabir-Karawa",
        "Dagaji",
        "Dundun",
        "Fagawa",
        "Fulatan",
        "Gafasa",
        "Gurduba",
        "Jiyaiya",
        "Kara Makama",
        "Kunkurawa",
        "Kwari",
        "Kyaberi",
        "Sakalawa",
        "Toranke",
        "Ungwar Bai",
        "Yanwawa",
        "Zagon Gulya"
    ],
    "Albasu": [
        "Albasu",
        "Bataiya",
        "Burburwa",
        "Chararana",
        "Cilibiri",
        "Daho",
        "Duja",
        "Faragai",
        "Farantama",
        "Gagarame",
        "Gwagwarandan",
        "Hamdullahi",
        "Hungu Sabuwa",
        "Jigar",
        "Jirago",
        "K/Sumaila",
        "Koga",
        "Mangari",
        "Panada",
        "Sayasaya",
        "Tsangaya",
        "Yaura"
    ],
    "Bagwai": [
        "Alajawa",
        "Badodo",
        "Bagwai",
        "Daddudda",
        "Dangada",
        "Dugurawa",
        "Gadanya",
        "Galawa",
        "Gogori",
        "Gurdi",
        "Jarimawa",
        "Joben-Yamma",
        "Kiyawa",
        "Kwajali",
        "Majin Gini",
        "Riminbai",
        "Romo",
        "Santar Lungu",
        "Sare Sare",
        "Sarkin Iya",
        "Ungwan Waimma",
        "Wuro Bagga",
        "Yar Tofa"
    ],
    "Bebeji": [
        "Anadariya",
        "Baguda",
        "Bebeji",
        "Churta Biki",
        "Damau",
        "Dawakin Dogo",
        "Durumawa",
        "Gargai",
        "Gunki",
        "Gwarmai",
        "Jibga",
        "Kofa",
        "Kuki",
        "Rahama",
        "Ranka",
        "Ranta",
        "Tariwa",
        "Wak",
        "Yak",
        "Yakun",
        "Yanshere"
    ],
    "Bichi": [
        "Aawa",
        "Abakur",
        "Badume",
        "Beguwa",
        "Belli",
        "Bichi",
        "Chiromawa",
        "D/Dorawa",
        "Daddo",
        "Damargu",
        "Daminawa",
        "Danzabuwa",
        "Dokoki",
        "Fagwalo",
        "Garun Bature",
        "Hagawa",
        "Hugulawa",
        "Iyawa",
        "Kakari",
        "Kaukau",
        "Kawaje",
        "Kungu",
        "Kwamarawa",
        "Kyauta",
        "Malikawar Garu",
        "Malikawr Sarari",
        "Marga",
        "Muntsira",
        "Rimaye",
        "Sabo",
        "Sanakur",
        "Saye",
        "Sum Sum",
        "Tinki",
        "Tsaure",
        "Tukubi",
        "Waire",
        "Yan Bundu",
        "Yan Gwarzo",
        "Yan Lami",
        "Yandutse",
        "Zukumi"
    ],
    "Bunkure": [
        "Barkum",
        "Bono",
        "Chirin",
        "D/Dundu",
        "Dundu",
        "Dususu",
        "Falingo",
        "Gabo",
        "Gafan",
        "Garanga",
        "Gora",
        "Gurjiya",
        "Gwamma",
        "Gwaneri",
        "Jalabi",
        "Jallorawa",
        "Jaroji",
        "Karnawa",
        "Kokotawa",
        "Kumurya",
        "Sabon Ruwa",
        "Satigal",
        "Shiye",
        "Tsamabaki",
        "Tudungali",
        "Tugugu",
        "Zanga"
    ],
    "Dala": [
        "Abba Tuwa",
        "Adakawa",
        "Airforce Base",
        "Airport Rd.",
        "Arzai",
        "Ashton Rd.",
        "Ayagi",
        "Bachirawa",
        "Madigu",
        "Bakin Ruwa",
        "Bokabo Barracks",
        "Chediyar Yangurasa",
        "Daganda",
        "Dala",
        "Dandalin Turawa",
        "Danbatta Way",
        "Danbazau",
        "Dandirshe",
        "Daurawan Yamma",
        "Daurawan Gabas",
        "Dawanau",
        "Dogon Nama",
        "Sanka",
        "Dukurawa",
        "Filin Durimi",
        "Garejin Danmaraya",
        "Gidan Dan Buzu",
        "Goburawa",
        "Goron Dutse",
        "Gwammaja",
        "Gwarzo Rd.",
        "Hajj Camp",
        "Hajuratul Islamiyya",
        "Isyaku Rabiu Housing",
        "Jujin Yanlabo",
        "K.C.C.",
        "K/Mazugal",
        "K/Ruwa",
        "Kabuwaya",
        "Kantudu",
        "Karofin Dala",
        "Katsina Rd.",
        "Kofar Mazugal",
        "Kofar Ruwa",
        "Kofar Ruwa Rd.",
        "Koki",
        "Koki Qtrs.",
        "Kulkul",
        "Kurna Babban Layi",
        "Kurna Makaranta",
        "Kwachiri Dikko",
        "Kwachiri Jube",
        "Kwarin Akuya",
        "Madugawa",
        "Mai Adua",
        "Makafin Dala",
        "Makin Ruwa",
        "Mallam Aminu Kano Way",
        "Masaka",
        "Mayeima",
        "Rijiyar Lemo",
        "Murtala Mohammed Way",
        "Orthopedic Hospital",
        "Physiotherapy Sch.",
        "Police Station",
        "Prison Yard",
        "Ramin Yantifa",
        "Rijiya Biyli",
        "Rijiya Itudu",
        "Sabon Birni",
        "Sakwaya Rd.",
        "Sakwaya Line",
        "Sararin Kadai",
        "Shirawa",
        "T/Fulari",
        "Tagwayen Gida",
        "Titin Dan Rimi",
        "Tudun Malam Labbo",
        "Wakilin Arewa",
        "Yalwa",
        "Yan Gadi",
        "Yan Katifa",
        "Yammata",
        "Yantandu",
        "Yarkasuwa Mararraba",
        "Zangon Bare-Bari"
    ],
    "Dala Rural": [
        "Aburawa",
        "Bafin/Ruwa",
        "Dadankaya",
        "Dandunshi",
        "Fuska Arewa",
        "Gandu",
        "K/Lunkwi",
        "K/Waika",
        "Man/Ladan",
        "Tudun Yola",
        "Waika",
        "Yalwa",
        "Yan/Tandu"
    ],
    "Danbatta": [
        "Ajumawa",
        "Barebari",
        "Danratta",
        "Danya",
        "Diggol",
        "Dukewa",
        "Dungurumi",
        "F/Dashi",
        "Fayam-Fayam",
        "Fogolawa",
        "Galoru",
        "Gwalaiba",
        "Gwanda",
        "Gwarabjawa",
        "Gwauran Maje",
        "Hazo",
        "Kadandani",
        "Katsarduwa",
        "Kore",
        "Kwasauri",
        "Mahuta",
        "Nassarawa",
        "Rade",
        "Ruwantsa",
        "Sansan",
        "Satame",
        "Tabo",
        "Takai",
        "Yam Mawa",
        "Yambawa",
        "Yanlada",
        "Zago"
    ],
    "Dawakin Kudu": [
        "Behun",
        "Dabakwari",
        "Danbagina",
        "Dasan Dosan",
        "Dawaki",
        "Dawakin Kudu",
        "Dawakji",
        "Gano Gumaka",
        "Gurjiya",
        "Jido",
        "Kadawa",
        "Kamagata",
        "Kantsi",
        "Kanwa",
        "Kwagwar Kaza",
        "M. Mata",
        "Mabarin Taba",
        "Muras",
        "Runa",
        "Santolo",
        "Sarai",
        "T/Gabas",
        "Takai",
        "Tamburawa",
        "Tanagar",
        "Tar Tofa",
        "Tsakuwa",
        "Ungwar Duniya",
        "Yanbarci",
        "Yanfari",
        "Yankatsare",
        "Yargay",
        "Zogarawa"
    ],
    "Dawakin Tofa": [
        "Alajawa",
        "B/Tumau",
        "Babban Ruga",
        "Badau",
        "Bagari",
        "Bambarawa Nasara",
        "Bankaura",
        "Chedi",
        "Dandalama",
        "Dawanau",
        "Dnaguguwa",
        "Dungurawa Kwa",
        "F/Kawo",
        "Jalli",
        "Kaleku",
        "Kunnawa",
        "Kwidawa",
        "Marke",
        "Rumi",
        "Sharkakiya",
        "Tattarawa",
        "Tumfefi",
        "Ungwar Jobenkun",
        "Ungwar Rimi",
        "Yanrutu",
        "Yelwa"
    ],
    "Doguwa": [
        "Bakarfa",
        "Bebeji",
        "Dadabo",
        "Dadinkowa",
        "Dandoki",
        "Dariyar Kudu",
        "Doguwa",
        "Falgore",
        "Fanyabo",
        "G/Makera",
        "G/Shere",
        "Jangefe",
        "Katsinawa",
        "Lungu",
        "Mahuta",
        "Maigodo",
        "Maikwadira",
        "Makarfi",
        "Malamawa",
        "Maraku",
        "Muchia",
        "Murai",
        "Pegi",
        "Ragada",
        "Ririwai",
        "Sabon Kwara",
        "Sabuwar",
        "Shiburu",
        "Surutwawa",
        "Tagwaye",
        "Tanalafiya",
        "Tilanbawa",
        "Tsauni",
        "U/Masama",
        "U/Tanko",
        "U/Turai",
        "Ungwar Tsohon-Sarki",
        "Zenabi"
    ]
};

const importWards = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) throw new Error("MONGO_URI (or MONGODB_URI) is not defined in .env");
        
        await mongoose.connect(uri);
        console.log("✓ Connected to MongoDB\n");

        // Get Kano State
        const kanoState = await State.findOne({ name: "Kano" });
        if (!kanoState) {
            throw new Error("Kano State not found - please run seedKanoLGAs.js first");
        }

        console.log("WARD IMPORT PROCESS");
        console.log("=".repeat(70));
        console.log(`Importing wards for ${Object.keys(KANO_WARDS_DATA).length} LGAs...\n`);

        let totalCreated = 0;
        let totalSkipped = 0;
        const importSummary = {};

        // Process each LGA
        for (const [lgaName, wardNames] of Object.entries(KANO_WARDS_DATA)) {
            console.log(`\nLGA: ${lgaName}`);
            console.log("─".repeat(70));

            // Get the LGA
            const lga = await LGA.findOne({ name: lgaName, state: kanoState._id });
            if (!lga) {
                console.log(`  ✗ ERROR: LGA "${lgaName}" not found!`);
                continue;
            }

            let lgaCreated = 0;
            let lgaSkipped = 0;
            const duplicates = [];

            // Import wards for this LGA
            for (const wardName of wardNames) {
                // Normalize: trim spaces
                const normalizedName = wardName.trim();

                // Prepare slug and ward payload
                const baseSlug = buildAreaSlug(normalizedName);
                const slug = await ensureUniqueSlug(baseSlug, lga._id);
                const areaId = buildAreaStableId(kanoState.name, lga.name, normalizedName);
                const lgaId = lga.lgaId || buildLGAStableId(kanoState.name, lga.name);

                // Check if ward already exists in this LGA
                const existingWard = await Ward.findOne({
                    name: normalizedName,
                    lga: lga._id
                });

                if (existingWard) {
                    let updated = false;
                    if (!existingWard.slug) {
                        existingWard.slug = slug;
                        updated = true;
                    }
                    if (!existingWard.areaId) {
                        existingWard.areaId = areaId;
                        updated = true;
                    }
                    if (!existingWard.lgaId) {
                        existingWard.lgaId = lgaId;
                        updated = true;
                    }
                    if (!existingWard.lgaName) {
                        existingWard.lgaName = lga.name;
                        updated = true;
                    }
                    if (!existingWard.country) {
                        existingWard.country = "Nigeria";
                        updated = true;
                    }
                    if (!Array.isArray(existingWard.aliases)) {
                        existingWard.aliases = [];
                        updated = true;
                    }
                    if (existingWard.latitude === undefined) {
                        existingWard.latitude = null;
                        updated = true;
                    }
                    if (existingWard.longitude === undefined) {
                        existingWard.longitude = null;
                        updated = true;
                    }
                    if (!existingWard.status) {
                        existingWard.status = "active";
                        updated = true;
                    }
                    if (!existingWard.isUrban) {
                        existingWard.isUrban = true;
                        updated = true;
                    }
                    if (updated) {
                        await existingWard.save();
                    }
                    console.log(`  ○ SKIP: ${normalizedName} (already exists)`);
                    duplicates.push(normalizedName);
                    lgaSkipped++;
                } else {
                    // Create new ward with canonical slug and stable IDs
                    await Ward.create({
                        name: normalizedName,
                        wardName: normalizedName,
                        areaId,
                        slug,
                        lga: lga._id,
                        lgaId,
                        lgaName: lga.name,
                        state: kanoState._id,
                        country: "Nigeria",
                        aliases: [],
                        latitude: null,
                        longitude: null,
                        coordinates: null,
                        isUrban: true,
                        status: "active",
                        feederIds: [],
                        isActive: true
                    });
                    console.log(`  ✓ CREATE: ${normalizedName}`);
                    lgaCreated++;
                }
            }

            totalCreated += lgaCreated;
            totalSkipped += lgaSkipped;

            importSummary[lgaName] = {
                total: wardNames.length,
                created: lgaCreated,
                skipped: lgaSkipped,
                duplicates: duplicates
            };

            console.log(`  Summary: Created ${lgaCreated}, Skipped ${lgaSkipped}/${wardNames.length}`);
        }

        // Verification
        console.log("\n" + "=".repeat(70));
        console.log("VERIFICATION");
        console.log("=".repeat(70));

        for (const [lgaName, wardNames] of Object.entries(KANO_WARDS_DATA)) {
            const lga = await LGA.findOne({ name: lgaName, state: kanoState._id });
            const wardCount = await Ward.countDocuments({ lga: lga._id, isActive: { $ne: false } });
            const expectedCount = wardNames.length;
            
            const status = wardCount === expectedCount ? "✓" : "✗";
            console.log(`${status} ${lgaName}: ${wardCount}/${expectedCount} wards`);

            if (wardCount !== expectedCount) {
                const wards = await Ward.find({ lga: lga._id, isActive: { $ne: false } }).select('name');
                const wardNames_existing = wards.map(w => w.name).sort();
                const wardNames_expected = wardNames.slice().sort();
                
                const missing = wardNames_expected.filter(n => !wardNames_existing.includes(n));
                if (missing.length > 0) {
                    console.log(`     Missing: ${missing.join(", ")}`);
                }
            }
        }

        // Final Summary
        console.log("\n" + "=".repeat(70));
        console.log("IMPORT SUMMARY");
        console.log("=".repeat(70));

        for (const [lgaName, summary] of Object.entries(importSummary)) {
            console.log(`\n${lgaName}:`);
            console.log(`  Total Wards: ${summary.total}`);
            console.log(`  Created: ${summary.created}`);
            console.log(`  Skipped (Duplicates): ${summary.skipped}`);
            if (summary.duplicates.length > 0) {
                console.log(`  Duplicate Names: ${summary.duplicates.join(", ")}`);
            }
        }

        console.log("\n" + "=".repeat(70));
        console.log("OVERALL STATISTICS");
        console.log("=".repeat(70));
        console.log(`Total Wards Imported: ${totalCreated}`);
        console.log(`Total Duplicates Skipped: ${totalSkipped}`);
        console.log(`Total Wards Processed: ${totalCreated + totalSkipped}`);
        console.log("=".repeat(70));

        // Check no postcodes were stored
        console.log("\nQUALITY CHECK - No Postcodes Stored");
        console.log("─".repeat(70));
        const wardsWithNumbers = await Ward.find({
            $expr: {
                $regexMatch: {
                    input: "$name",
                    regex: "\\d{6}"  // Looks for 6-digit postcodes
                }
            }
        });

        if (wardsWithNumbers.length === 0) {
            console.log("✓ No postcodes found in ward names");
        } else {
            console.log(`✗ WARNING: Found ${wardsWithNumbers.length} wards with postcodes:`);
            wardsWithNumbers.forEach(w => console.log(`  - ${w.name}`));
        }

        console.log("\n✓ Ward import completed successfully!");
        process.exit(0);

    } catch (error) {
        console.error("✗ Import failed:", error.message);
        process.exit(1);
    }
};

importWards();
