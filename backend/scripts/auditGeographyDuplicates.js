import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const audit = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) throw new Error("MONGO_URI (or MONGODB_URI) is not defined in .env");
        
        await mongoose.connect(uri);
        console.log("✓ Connected to MongoDB\n");

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log("Available collections:", collections.map(c => c.name).join(", "));
        console.log("\n" + "=".repeat(80) + "\n");

        // 1. Audit Countries
        console.log("1. COUNTRIES AUDIT");
        console.log("-".repeat(80));
        const countries = await db.collection("countries").find({}).toArray();
        console.log(`Total Countries: ${countries.length}`);
        countries.forEach(c => {
            console.log(`  - ${c.name} (${c.code || 'no code'}) | ID: ${c._id} | Active: ${c.isActive} | Status: ${c.status}`);
        });
        console.log();

        // 2. Audit States
        console.log("2. STATES AUDIT");
        console.log("-".repeat(80));
        const states = await db.collection("states").find({}).toArray();
        console.log(`Total States: ${states.length}`);
        
        // Group states by country
        const statesByCountry = {};
        states.forEach(s => {
            const countryId = s.country ? s.country.toString() : 'no-country';
            if (!statesByCountry[countryId]) {
                statesByCountry[countryId] = [];
            }
            statesByCountry[countryId].push(s);
        });

        // Check for duplicate state names within each country
        for (const [countryId, countryStates] of Object.entries(statesByCountry)) {
            const countryName = countryId === 'no-country' ? 'No Country' : 
                (countries.find(c => c._id.toString() === countryId)?.name || countryId);
            console.log(`\nCountry: ${countryName} (${countryStates.length} states)`);
            
            const stateNames = countryStates.map(s => s.name);
            const nameCounts = {};
            stateNames.forEach(name => {
                nameCounts[name] = (nameCounts[name] || 0) + 1;
            });
            
            const duplicates = Object.entries(nameCounts).filter(([name, count]) => count > 1);
            if (duplicates.length > 0) {
                console.log("  ⚠️  DUPLICATE STATES FOUND:");
                duplicates.forEach(([name, count]) => {
                    console.log(`    - "${name}" appears ${count} times`);
                    countryStates.filter(s => s.name === name).forEach(s => {
                        console.log(`      ID: ${s._id} | Active: ${s.isActive} | Status: ${s.status} | companyId: ${s.companyId || 'null'}`);
                    });
                });
            } else {
                console.log("  ✓ No duplicate state names");
            }
            
            // List all states in this country
            countryStates.forEach(s => {
                console.log(`  - ${s.name} | ID: ${s._id} | Active: ${s.isActive} | Status: ${s.status} | companyId: ${s.companyId || 'null'}`);
            });
        }
        console.log();

        // 3. Audit LGAs
        console.log("3. LGAS AUDIT");
        console.log("-".repeat(80));
        const lgas = await db.collection("lgas").find({}).toArray();
        console.log(`Total LGAs: ${lgas.length}`);
        
        // Group LGAs by state
        const lgasByState = {};
        lgas.forEach(l => {
            const stateId = l.state ? l.state.toString() : 'no-state';
            if (!lgasByState[stateId]) {
                lgasByState[stateId] = [];
            }
            lgasByState[stateId].push(l);
        });

        // Check for duplicate LGA names within each state
        for (const [stateId, stateLgas] of Object.entries(lgasByState)) {
            const stateName = stateId === 'no-state' ? 'No State' : 
                (states.find(s => s._id.toString() === stateId)?.name || stateId);
            console.log(`\nState: ${stateName} (${stateLgas.length} LGAs)`);
            
            const lgaNames = stateLgas.map(l => l.name);
            const nameCounts = {};
            lgaNames.forEach(name => {
                nameCounts[name] = (nameCounts[name] || 0) + 1;
            });
            
            const duplicates = Object.entries(nameCounts).filter(([name, count]) => count > 1);
            if (duplicates.length > 0) {
                console.log("  ⚠️  DUPLICATE LGAs FOUND:");
                duplicates.forEach(([name, count]) => {
                    console.log(`    - "${name}" appears ${count} times`);
                    stateLgas.filter(l => l.name === name).forEach(l => {
                        console.log(`      ID: ${l._id} | companyId: ${l.companyId || 'null'}`);
                    });
                });
            } else {
                console.log("  ✓ No duplicate LGA names");
            }
        }
        console.log();

        // 4. Audit Wards
        console.log("4. WARDS AUDIT");
        console.log("-".repeat(80));
        const wards = await db.collection("wards").find({}).toArray();
        console.log(`Total Wards: ${wards.length}`);
        
        // Group Wards by LGA
        const wardsByLGA = {};
        wards.forEach(w => {
            const lgaId = w.lga ? w.lga.toString() : 'no-lga';
            if (!wardsByLGA[lgaId]) {
                wardsByLGA[lgaId] = [];
            }
            wardsByLGA[lgaId].push(w);
        });

        // Check for duplicate Ward names within each LGA
        for (const [lgaId, lgaWards] of Object.entries(wardsByLGA)) {
            const lgaName = lgaId === 'no-lga' ? 'No LGA' : 
                (lgas.find(l => l._id.toString() === lgaId)?.name || lgaId);
            console.log(`\nLGA: ${lgaName} (${lgaWards.length} Wards)`);
            
            const wardNames = lgaWards.map(w => w.name);
            const nameCounts = {};
            wardNames.forEach(name => {
                nameCounts[name] = (nameCounts[name] || 0) + 1;
            });
            
            const duplicates = Object.entries(nameCounts).filter(([name, count]) => count > 1);
            if (duplicates.length > 0) {
                console.log("  ⚠️  DUPLICATE WARDS FOUND:");
                duplicates.forEach(([name, count]) => {
                    console.log(`    - "${name}" appears ${count} times`);
                });
            }
        }
        console.log();

        // 5. Audit Companies and their coverage
        console.log("5. COMPANIES AUDIT");
        console.log("-".repeat(80));
        const companies = await db.collection("companies").find({}).toArray();
        console.log(`Total Companies: ${companies.length}`);
        companies.forEach(c => {
            console.log(`  - ${c.name} (${c.code}) | ID: ${c._id}`);
            console.log(`    Coverage States: ${c.coverageStates ? c.coverageStates.join(", ") : 'none'}`);
            console.log(`    Headquarters: ${c.headquarters?.state || 'none'}`);
        });
        console.log();

        // 6. Audit Feeders
        console.log("6. FEEDERS AUDIT");
        console.log("-".repeat(80));
        const feeders = await db.collection("feeders").find({}).toArray();
        console.log(`Total Feeders: ${feeders.length}`);
        feeders.forEach(f => {
            console.log(`  - ${f.name} | ID: ${f._id} | Wards: ${f.wards?.length || 0}`);
        });
        console.log();

        // 7. Audit Users with state references
        console.log("7. USERS AUDIT (state field)");
        console.log("-".repeat(80));
        const users = await db.collection("users").find({}).toArray();
        console.log(`Total Users: ${users.length}`);
        const usersByState = {};
        users.forEach(u => {
            if (u.state) {
                usersByState[u.state] = (usersByState[u.state] || 0) + 1;
            }
        });
        console.log("Users by state name:");
        Object.entries(usersByState).forEach(([state, count]) => {
            console.log(`  - ${state}: ${count} users`);
        });
        console.log();

        // 8. Audit Reports with state/lga references
        console.log("8. REPORTS AUDIT (state/lga fields)");
        console.log("-".repeat(80));
        const reports = await db.collection("reports").find({}).toArray();
        console.log(`Total Reports: ${reports.length}`);
        const reportsByState = {};
        const reportsByLGA = {};
        reports.forEach(r => {
            if (r.state) {
                reportsByState[r.state] = (reportsByState[r.state] || 0) + 1;
            }
            if (r.lga) {
                reportsByLGA[r.lga] = (reportsByLGA[r.lga] || 0) + 1;
            }
        });
        console.log("Reports by state name:");
        Object.entries(reportsByState).forEach(([state, count]) => {
            console.log(`  - ${state}: ${count} reports`);
        });
        console.log();

        // 9. Specific Kano State Analysis
        console.log("9. KANO STATE SPECIFIC ANALYSIS");
        console.log("-".repeat(80));
        const kanoStates = states.filter(s => s.name.toLowerCase() === 'kano');
        console.log(`Kano State records found: ${kanoStates.length}`);
        kanoStates.forEach((ks, index) => {
            console.log(`\nKano Record #${index + 1}:`);
            console.log(`  ID: ${ks._id}`);
            console.log(`  Country: ${ks.country}`);
            console.log(`  Country Name: ${ks.countryName}`);
            console.log(`  Active: ${ks.isActive}`);
            console.log(`  Status: ${ks.status}`);
            console.log(`  CompanyId: ${ks.companyId || 'null'}`);
            console.log(`  Created: ${ks.createdAt}`);
            
            // Count LGAs for this Kano
            const kanoLgas = lgas.filter(l => l.state && l.state.toString() === ks._id.toString());
            console.log(`  LGAs referencing this Kano: ${kanoLgas.length}`);
            
            // Count Wards for this Kano (via LGAs)
            const kanoWardIds = kanoLgas.map(l => l._id.toString());
            const kanoWards = wards.filter(w => w.lga && kanoWardIds.includes(w.lga.toString()));
            console.log(`  Wards under this Kano's LGAs: ${kanoWards.length}`);
        });
        console.log();

        // 10. Summary
        console.log("=".repeat(80));
        console.log("AUDIT SUMMARY");
        console.log("=".repeat(80));
        console.log(`Countries: ${countries.length}`);
        console.log(`States: ${states.length}`);
        console.log(`LGAs: ${lgas.length}`);
        console.log(`Wards: ${wards.length}`);
        console.log(`Feeders: ${feeders.length}`);
        console.log(`Companies: ${companies.length}`);
        console.log(`Users: ${users.length}`);
        console.log(`Reports: ${reports.length}`);
        console.log(`Kano State records: ${kanoStates.length}`);
        console.log("=".repeat(80));

        process.exit(0);

    } catch (error) {
        console.error("✗ Audit failed:", error);
        process.exit(1);
    }
};

audit();
