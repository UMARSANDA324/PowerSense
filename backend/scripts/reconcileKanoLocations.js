import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import State from "../models/Location/State.js";
import LGA from "../models/Location/LGA.js";
import Ward from "../models/Location/Ward.js";
import { slugify, buildAreaSlug, buildAreaStableId, buildLGAStableId } from "../utils/slugGenerator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const VALID_KANO_LGAS = [
  "Ajingi", "Albasu", "Bagwai", "Bebeji", "Bichi", "Bunkure", "Dala",
  "Dala Rural", "Danbatta", "Dawakin Kudu", "Dawakin Tofa", "Doguwa", "Fagge",
  "Gabasawa", "Garko", "Garum Mallam", "Gaya", "Gezawa", "Gwale",
  "Gwarzo", "Kabo", "Kano Municipal", "Karaye", "Kibiya", "Kiru",
  "Kumbotso", "Kunchi", "Kura", "Madobi", "Makoda", "Minjibir",
  "Nasarawa", "Rano", "Rimin Gado", "Rogo", "Shanono", "Sumaila",
  "Takai", "Tarauni", "Tofa", "Tsanyawa", "Tudun Wada", "Ungogo",
  "Warawa", "Wudil"
];

const AREA_LGA_OVERRIDES = {
  "Fagge": "Fagge",
  "Dala": "Dala",
  "Badawa": "Nasarawa",
  "Government House": "Kano Municipal",
  "Emir Palace": "Kano Municipal",
  "Kofar Mata": "Kano Municipal"
};

const normalizeAreaName = (value) => {
  if (!value) return "";
  return String(value)
    .replace(/\b\d{5,6}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const normalizeAlias = (value) => {
  if (!value) return null;
  return String(value).trim();
};

const buildCanonicalId = (value) => {
  if (!value) return "";
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
};

const buildLgaId = (lgaName) => `lga_${buildCanonicalId(lgaName)}`;
const buildCommunityId = (lgaName, communityName) => `${buildCanonicalId(lgaName)}_${buildCanonicalId(communityName)}`;

const reconcile = async () => {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGO_URI not defined");

    await mongoose.connect(uri);
    console.log("✓ Connected to MongoDB");

    const state = await State.findOne({ name: "Kano" });
    if (!state) {
      throw new Error("Kano State not found");
    }

    console.log("\nCANONICAL KANO LOCATION RECONCILIATION");
    console.log("=".repeat(80));

    const lgaMap = {};
    for (const lgaName of VALID_KANO_LGAS) {
      let lga = await LGA.findOne({ name: lgaName, state: state._id });
      const slug = slugify(lgaName);
      const lgaId = buildLGAStableId(state.name, lgaName);

      if (!lga) {
        lga = await LGA.create({
          name: lgaName,
          slug,
          lgaId,
          state: state._id,
          status: "active",
          isActive: true
        });
        console.log(`  ✓ Created missing LGA: ${lgaName}`);
      } else {
        let updated = false;
        if (!lga.slug || lga.slug !== slug) {
          lga.slug = slug;
          updated = true;
        }
        if (!lga.lgaId || lga.lgaId !== lgaId) {
          lga.lgaId = lgaId;
          updated = true;
        }
        if (lga.status !== "active") {
          lga.status = "active";
          updated = true;
        }
        if (lga.isActive === false) {
          lga.isActive = true;
          updated = true;
        }
        if (updated) {
          await lga.save();
          console.log(`  ✓ Updated LGA metadata: ${lgaName}`);
        }
      }
      lgaMap[lgaName] = lga;
    }

    const activeLGAs = await LGA.find({ state: state._id, isActive: { $ne: false } });
    const invalidLGAs = activeLGAs.filter(lga => !VALID_KANO_LGAS.includes(lga.name));

    if (invalidLGAs.length > 0) {
      console.log("\nInvalid/extra active LGAs detected:");
      invalidLGAs.forEach(lga => console.log(`  - ${lga.name} (${lga._id})`));
    }

    const wards = await Ward.find({ state: state._id, isActive: { $ne: false } }).populate('lga');
    const summary = {
      totalAreas: wards.length,
      duplicatesRemoved: 0,
      areasRelocated: 0,
      invalidNamesFixed: 0,
      aliasCount: 0,
      warnings: []
    };

    const groupedByLGA = {};
    const canonicalWardMap = {};

    for (const ward of wards) {
      const originalName = ward.name;
      const normalizedName = normalizeAreaName(originalName);
      const originalLgaName = ward.lga ? ward.lga.name : null;
      let targetLga = ward.lga;

      if (!normalizedName) {
        summary.warnings.push(`Empty or invalid ward name for ward ${ward._id}`);
        continue;
      }

      if (normalizedName !== originalName) {
        if (!ward.aliases.includes(originalName)) {
          ward.aliases.push(originalName);
          summary.aliasCount += 1;
        }
        ward.name = normalizedName;
        ward.wardName = normalizedName;
        ward.status = ward.status || "active";
        ward.isActive = ward.isActive !== false;
        ward.latitude = ward.latitude ?? null;
        ward.longitude = ward.longitude ?? null;
        summary.invalidNamesFixed += 1;
      }

      const desiredLgaName = AREA_LGA_OVERRIDES[normalizedName];
      if (desiredLgaName && desiredLgaName !== originalLgaName) {
        const overrideLGA = lgaMap[desiredLgaName];
        if (overrideLGA) {
          ward.lga = overrideLGA._id;
          ward.lgaName = overrideLGA.name;
          ward.lgaId = overrideLGA.lgaId;
          summary.areasRelocated += 1;
          targetLga = overrideLGA;
          summary.warnings.push(`Relocated "${normalizedName}" from ${originalLgaName || "UNKNOWN"} to ${desiredLgaName}`);
        }
      }

      if (!targetLga || !VALID_KANO_LGAS.includes(targetLga.name)) {
        summary.warnings.push(`Ward "${normalizedName}" references invalid LGA "${targetLga ? targetLga.name : "UNKNOWN"}"`);
      }

      const slug = buildAreaSlug(normalizedName);
      let safeSlug = slug;
      let suffix = 1;
      while (await Ward.findOne({ lga: targetLga ? targetLga._id : ward.lga, slug: safeSlug, _id: { $ne: ward._id } })) {
        safeSlug = `${slug}-${suffix}`;
        suffix += 1;
      }

      const areaId = buildAreaStableId(state.name, targetLga ? targetLga.name : originalLgaName || "Kano", normalizedName);

      ward.slug = safeSlug;
      ward.areaId = areaId;
      ward.lgaId = targetLga ? targetLga.lgaId : ward.lgaId || buildLGAStableId(state.name, originalLgaName || "UNKNOWN");
      ward.lgaName = targetLga ? targetLga.name : ward.lgaName || originalLgaName || "UNKNOWN";
      ward.country = ward.country || "Nigeria";
      ward.coordinates = ward.coordinates || null;
      ward.latitude = ward.latitude ?? null;
      ward.longitude = ward.longitude ?? null;
      ward.status = ward.status || "active";
      ward.isUrban = ward.isUrban !== false;
      ward.aliases = Array.isArray(ward.aliases) ? [...new Set(ward.aliases.filter(Boolean))] : [];

      await ward.save();

      const lgaKey = ward.lgaName || "UNKNOWN";
      groupedByLGA[lgaKey] = (groupedByLGA[lgaKey] || 0) + 1;
      const canonicalKey = `${ward.lgaName}::${ward.name.toLowerCase()}`;
      if (!canonicalWardMap[canonicalKey]) {
        canonicalWardMap[canonicalKey] = ward;
      } else {
        const master = canonicalWardMap[canonicalKey];
        if (master._id.toString() !== ward._id.toString()) {
          const mergedAliases = new Set([...(master.aliases || []), ...(ward.aliases || []), master.name, ward.name]);
          master.aliases = [...mergedAliases].filter((a) => a !== master.name);
          master.areaId = master.areaId || areaId;
          await master.save();

          ward.isActive = false;
          ward.status = "inactive";
          await ward.save();
          summary.duplicatesRemoved += 1;
          summary.aliasCount += mergedAliases.size;
          summary.warnings.push(`Merged duplicate ward "${ward.name}" in ${ward.lgaName}`);
        }
      }
    }

    console.log("\nSUMMARY REPORT");
    console.log("=".repeat(80));
    console.log(`Total LGAs: ${VALID_KANO_LGAS.length}`);
    console.log(`Total Areas: ${summary.totalAreas}`);
    console.log(`Duplicates Removed: ${summary.duplicatesRemoved}`);
    console.log(`Areas Relocated: ${summary.areasRelocated}`);
    console.log(`Invalid Names Fixed: ${summary.invalidNamesFixed}`);
    console.log(`Alias Count: ${summary.aliasCount}`);

    if (summary.warnings.length > 0) {
      console.log("\nWARNINGS");
      summary.warnings.forEach(w => console.log(`  - ${w}`));
    }

    console.log("\nLOCATION GROUPING BY LGA");
    console.log("=".repeat(80));
    Object.entries(groupedByLGA)
      .sort((a, b) => b[1] - a[1])
      .forEach(([lgaName, count]) => console.log(`  ${lgaName}: ${count} areas`));

    console.log("\n✓ Reconciliation complete. Run verifyKanoLocations.js for a second pass.");
    process.exit(0);
  } catch (error) {
    console.error("✗ Reconciliation failed:", error.message);
    process.exit(1);
  }
};

reconcile();

const KANO_BATCH_DATA = [
  {
    name: "Karaye",
    communities: [
      "Adama","Barbaji","Bauni","Citama","Dadinkowa","Danzuwa","Daura","Daurawa","Figi","Jajaye",
      "Kalako","Karaye","Karshi","Kumbu Gawa","Kwanyawa","Kyari","Ma","Nasarawa","Saunagari",
      "Tofa","Turawa","Ungawar Randi","Ungwar Alhazawa","Ungwar Dawa","Yola"
    ]
  },
  {
    name: "Kibiya",
    communities: [
      "Agiri","Bacha","Burmuni","Chaibo","Dungu","Durba","Dususu","Falange","Fammar","Fanchi",
      "Gadako","Gari","Gingiya","Gunda","Jabanni","Jar Mawa","Kadigana","Kibiya","Kuluki",
      "Kure","Lausu","Madachi","Nariya","Sanda","Sarari","Shingi","Tarai","U/Liman"
    ]
  },
  {
    name: "Kiru",
    communities: [
      "Baawa","Bauda","Dangora","Danshoshiya","Dashi","Daurawa","Dum","Jamar Barde","Jibya",
      "Kadangaru","Kankan","Kiru","Kogo","Lamin Kwoi","Mallam Bature","Maraku","Maska","Rangas",
      "Sagi","Sarkama","Tsaudawa","U/Isakuwa","Ungwar Kaka","Ungwar Kwari","Ungwar Musa","Yako",
      "Yalwa","Yam","Zuwo"
    ]
  },
  {
    name: "Kumbotso",
    communities: [
      "Bechi","Challawa","Damfami","Dan Gwauro Hago","Dan Gwauro Illiyasu","Dan Maliki","Danbare",
      "Dangwauro","Farawa","Gaida","Guringawa","Gwazaya","Hawandawaki","Kayi Panshekara","Krinbo",
      "Kumbotso","Kure Ken","Kusaba","Kuyan Ta Inna","Kuyan Tasidi","Limana","Maidinawa","Mariri",
      "Panshekara","Runkusawa","Samegu","Sarkin Shanu","Shekar Barde","Shekar Madaki","Tamburawa",
      "U/Rimi","Umarawa","Unguwar Yamu","Wailari","Yankusa","Yanshana"
    ]
  },
  {
    name: "Kunchi",
    communities: [
      "B/Sadawa","Baje","Birkin","Dankwai","Dunbulin","Dunkwai","G/Sheme","Gwadama","Gwarmai",
      "Jodade","Kaya","Kuku","Kunchi","Luka","Magawata","Matan Fada","Pollw","Shamakawa","Shuwaki",
      "Tofawa","Unguwar Gyartai","Yan Kifi","Yandadi"
    ]
  },
  {
    name: "Kura",
    communities: [
      "Danhassan","Dukawa","Gamadam","Gundutse","Imawa","Imawakore","Karfi","Kosawa","Kunshama",
      "Kura","Mudawa","Rugar Duka","Sadauki","Sayawa","Shafawa","Tofa","Yakasai","Yalwa"
    ]
  }
];
