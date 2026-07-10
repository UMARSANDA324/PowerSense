import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";

// Import models
import Feeder from "../models/Location/Feeder.js";
import InjectionSubstation from "../models/Location/InjectionSubstation.js";
import State from "../models/Location/State.js";
import LGA from "../models/Location/LGA.js";
import Ward from "../models/Location/Ward.js";
import FeederCoverage from "../models/Location/FeederCoverage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

// Load community lookup data
const communityLookupPath = path.join(__dirname, "../data/communityLookup.json");
const communityLookup = JSON.parse(fs.readFileSync(communityLookupPath, "utf-8"));

const RAW_FEEDER_DATA = `A 11KV AHMADU BELLO CLUB INJECTION SUBSTATION AHMADU BELLO WAYAND MURTALA MUHD WAY KANO 20
A 11KV APEX FADAMA INJECTION SUBSTATION CBN, KATSINA 20
A 11KV AUDU BAKO CLUB INJECTION SUBSTATION AHMADU BELLO WAYAND MURTALA MUHD WAY KANO 20
A 11KV BANK ROAD CLUB INJECTION SUBSTATION BANK ROAD KANO 20
A 11KV BOMPAI BRISCOE INJECTION SUSTATION BOMPAI ROAD KANO 20
A 11KV CERAMIC ABATTOIR INJECTION SUBSTATION CHALLAWA INDUSTRIAL AREA 20
A 11KV CHALLAWA WATER PLANT CHALLAWA INJECTION SUBSTATION WATER PLANT CHALLAWA 20
A 11KV DALA FOODS GONGONI INJECTION SUBSTATION SHARADA INDUSTRIAL KANO 20
A 11KV DR BALA BUK INJECTION SUBSTATION R/ZAKI ALONG GWARZO ROAD, BARAKAT STORE, JAIZ BANK AND ZENITH BANK. 20
A 11KV FANTAI HADEJIA NIPP INJECTION SUB STATION BANK ROAD, KANO ROAD HADEJIA JIGAWA STATE 20
A 11KV FUNTUA TEXTILE MILL TEXTILE INJECTION SUBSTATION FUNTUA TEXTILE MILL 20
A 11KV FUNTUA WATER WORKS TEXTILE INJECTION SUBSTATION FUNTUA WATER WORKS 20
A 11KV GOVERNMENT HOUSE DUTSE DUTSE INJECTION SUBSTATION GOVERNMENT HOUSE AND MINISTRY OF LAND DUTSE. 20
A 11KV GWARZO ROAD 11KV GWARZO ROAD BUK INJECTION SUBSTATION 20
A 11KV INDUSTRIAL KATSINA ROAD INJECTION SUBSTATION FUNTUA INDUSTRIAL 20
A 11KV LAMBISA FARM CENTER INJECTION SUBSTATION HOTORO GRA, MAIDUGURI ROAD, KANO 20
A 11KV MAIMALARI BRISCOE INJECTION SUSTATION MAIMALARI BOMPAI KANO 20
A 11KV NBC ABATTOIR INJECTION SUBSTATION CHALLAWA INDUSTRIAL AREA 20
A 11KV NUHU SUNUSI 20
A 11KV RIJIMA RICE DAURA INJECTION SUBSTATION RIJIMA BARRACK, KATSINA 20
A 11KV TAMBURAWA WATER PLANT TAMBURAWA INJECTION SUBSTATION WATER PLANT TAMBURAWA 20
A 11KV TOKARAWA DAKATA TS FRANCE ROAD, KANO 20
A 11KV WUDIL COMMERCIAL WUDIL INJECTION SUBSTATION GAYA ROAD WUDIL COMMERCIAL AREA 20
A 11KV YUSUF ROAD BRISCOE INJECTION SUSTATION YUSUF ROAD KANO 20
A 33KV AJIWA WATER WORKS KATSINA TS NEW GOVT HOUSE, SSS OFFICE, INEC TOURIST LODGE, AJIWA WATER TREATMENT 20
A 33KV ANGELS KUMBOTSO TS SHARADA INDUSTRIAL AREA 20
A 33KV ATM KUMBOTSO TS CHALLAWA INDUSTRIAL AREA 20
A 33KV BIRNIN KUDU DUTSE TS KWANAR HUGUMA, YALWAN DAMAI AND GWARAM TOWN. 20
A 33KV BRISCOE DAKATA TS INDEPENDENCE ROAD 20
A 33KV CBN DAN AGUNDI TS ADO BAYERO MALL, BRISTOL HOTEL,STATE ROAD, AUDU BAKO WAY AND POST OFFICE ROAD KANO 20
A 33KV CHALLAWA WATER WORKS TAMBURAWA TS WATER PLANT CHALLAWA 20
A 33KV CLUB DAN AGUNDI TS KANO CLUB INJECTION SUBSTATION 20
A 33KV COCA COLA TAMBURAWA TS CHALLAWA INDUSTRIAL AREA 20
A 33KV DAN AGUNDI 1 DAN AGUNDI TS DANAGUNDI INJECTION SUB STATION KANO CITY 20
A 33KV DAN AGUNDI 2 DAN AGUNDI TS DANAGUNDI INJECTION SUBSTATION, BUK ROAD, KANO 20
A 33KV DANGOTE KUMBOTSO TS SHARADA INDUSTRIAL AREA 20
A 33KV DAURA TEXTILE INJECTION SUBSTATION ENTIRE MAIRUWA TOWN, KATSINA. 20
A 33KV DAWANAU INDUSTRIAL BUKAVU INJECTION SUBSTATION POLEWIRE LINE, JAJIRA, KATSINAWA AND DAWANAU AREAS. 20
A 33KV DR JIMETA 20
A 33KV DUTSE DUTSE TS FUD, DUTSE. 20
A 33KV FLOUR MILLS DAKATA TS DAKATA SMALL SCALE AND BOMPAI AREA. 20
A 33KV GASKIYA 33KV GASKIYA DAKATA TS 20
A 33KV HADEJIA HADEJIA TS HADEJIA, BIRNIWA, UNIVERSITY, GUMEL, KAFIN HAUSA 20
A 33KV JODA DAKATA TS HADEJIA ROAD 20
A 33KV KAFIN HAUSA HADEJIA TS HADEJIA, K/HAUSA AND KANO ROAD JIGAWA STATE 20
A 33KV KATSINA ROAD FUNTUA TS KATSINA ROAD INJECTION SUBSTATION, FUNTUA 20
A 33KV KOFAR GUGA KATSINA TS FEDERAL TEACHING HOSPITAL KATSINA 20
A 33KV KURNA KATSINA TS KAITA, DANKAMA, MAKURDA AND HIGH COURT, KATSINA. 20
A 33KV LAW SCHOOL DANGORA TS BAGAUDA, TARAU AND GARIN MALLAM AREA. 20
A 33KV MAMUDA KUMBOTSO TS CHALLAWA INDUSTRIAL AREA 20
A 33KV MTN DAKATA TS BOMPAI INDUSTRIAL AREA 20
A 33KV NB CERAMIC DANGORA TS NB CERAMIC CO K/DANGORA, ZARIA ROAD KANO 20
A 33KV NNPC DAKATA TS HOTORO NNPC BYE BASS, TINSHAMA AND LADANAI AREA. 20
A 33KV POWER HOUSE KATSINA TS IBB WAY INJECTION SUB STATION KATSINA URBAN 20
A 33KV RICE FIELD TAMBURAWA TS GWARZO ROAD, INDUSTRIAL AREA 20
A 33KV RICE MILLS GAGARAWA TS GUJUNGU, JIGAWA RICE MILLS, GAGARAWA 20
A 33KV RUMMAWA DAKATA TS RUMMAWA INDUSTRIAL HUB 20
A 33KV SARKIN YAKI 33KV SARKIN YAKI 33KV SARKIN YAKI 20
A 33KV SHARADA BATA KUMBOTSO TS SHARADA BATA INJECTION SUBSTATION 20
A 33KV SMALL SCALE DAKATA TS DAKATA SMALL SCALE 20
A 33KV SPANISH 1 KUMBOTSO TS SHARADA INDUSTRIAL AREA 20
A 33KV SPANISH 2 KUMBOTSO TS SHARADA INDUSTRIAL AREA 20
A 33KV TAMBURAWA WATER WORKS TAMBURAWA TS WATER TREATMENT PLANT TAMBURAWA 20
A 33KV TEXTILE FUNTUA TS FUNTUA TEXTILE,MAIRUWA ROAD FUNTUA 20
A 33KV UNIVERSITY HADEJIA TS HADEJIA, BIRNIWA, UNIVERSITY, GUMEL, KAFIN HAUSA 20
A 33KV WUDIL WUDL TS KUST, WUDIL 20
A 33KV ZARIA ROAD DAN AGUNDI TS AKTH,NAIBAWA, ZARIA ROAD KANO 20
B 11KV ABUJA ROAD IDH INJECTION SUBSTATION FRANCE ROAD, COURT ROAD AND MIDDLE ROAD. 16
B 11KV AIRPORT ROAD PRP INJECTION SUBSTATION AIRPORT ROAD, FOUTAIN ESTATE AND JABA AREA. 16
B 11KV AJASA DAN AGUNDI INJECTION SUBSTATION KANO TRADE FARE, ZOO ROAD AND AJASA 16
B 11KV BADAWA CLUB INJECTION SUBSTATION BADAWA LAYOUT, LAMIDO CRESCENT AND SARDAUNA CRESCENT. 16
B 11KV BAYAJIDDA DAURA INJECTION SUBSTATION DAURA METROPOLITAN 16
B 11KV BELLO DANDAGO RADIO HOUSE INJECTION SUBSTATION RADIO HOUSE. 16
B 11KV DAKATA KAWAJI INJECTION SUBSTATION DAKATA AND KAWAJI AREA. 16
B 11KV DANDAGORO IBB WAY INJECTION SUBSTATION FEDERAL SECRETARIAT KATSINA AND DANDAGORO 16
B 11KV DANLADI NASIDI MARIRI INJECTION SUBSTATION DANLADI NASIDI HOUSING ESTATE. 16
B 11KV DAURAMA DAURA INJECTION SUBSTATION DAURA METROPOLITAN 16
B 11KV GARU DUTSE INJECTION SUBSTATION FAGOJI AND GARU EMIRS PALACE ROAD. 16
B 11KV HASSAN USMAN ROAD FADAMA INJECTION SUBSTATION HASSAN USMAN KATSINA ROAD AND GRA KATSINA. 16
B 11KV HAUSAWA ZARIA ROAD INJECTION SUBSTATION BAWO ROAD AND HAUSAWA MASALLACHIN MURTALA ROAD. 16
B 11KV HOUSING ESTATE SHARADA INJECTION SUBSTATION HOUSING ESTATE AREA. 16
B 11KV IBRAHIM TAIWO DAN AGUNDI INJECTION SUBSTATION IBRAHIM TOIWO ROAD, KOFAR DAN AGUNDI AND KWARI MARKET 16
B 11KV INDEPENDENCE BRISCOE INJECTION SUBSTATION INDEPENDENCE ROAD, GAWAUNA AND KINGS GARDEN AREA. 16
B 11KV KABUGA GORON DUTSE INJECTION SUBSTATION GADON KAYA, SALANTA AND KUNTAU AREA. 16
B 11KV KADARKO FADAMA INJECTION SUBSTATION KADARKO AREA, KATSINA 16
B 11KV KARKASARA ZARIA ROAD INJECTION SUBSTATION KARKASARA, HASSAN GWARZO SECONDARY AND ROYAL CITY ESTATE. 16
B 11KV LOW COST IBB WAY NIPP INJECTION SUBSTATION LOW COST, KATSINA 16
B 11KV MAJE HADEJIA INJECTION SUBSTATION MALAM MADORI ROAD. 16
B 11KV MAJESTIC BIRNIN KUDU INJECTION SUBSTATION MAJESTIC RICE COMPANY. 16
B 11KV MASARAUTA NAIBAWA INJECTION SUBSTATION NAIBAWA ZARIA ROAD AND SAADATU RIMI COLLEGE OF EDUCATION. 16
B 11KV MURTALA MUHAMMED CLUB INJECTION SUBSTATION MURTALA MOHD WAY, FRANCEROAD AND IGBO ROAD 16
B 11KV NEW SITE BUK INJECTION SUBSTATION BUK NEW CAMPUS. 16
B 11KV NNDC SHARADA INJECTION SUBSTATION NNDC AND SHARADA AREA. 16
B 11KV NOMANSLAND BUKAVU INJECTION SUBSTATION NOMANSLAND AND KATSINA ROAD AREAS. 16
B 11KV RACE COURSE CLUB INJECTION SUBSTATION RACE COURSE ROAD, ALU AVENUE AND LAMIDO CRESCENT. 16
B 11KV SABON GARI IDH INJECTION SUBSTATION WEATHER HEAD, BAMA ROAD, GOLD COAST, IJEBU BALATUS AND ENUGU ROAD. 16
B 11KV SANI ABACHA WAY DUTSE NIPP INJECTION SUBSTATION BANK ROAD DUTSE AND G9 QUARTERS AREA. 16
B 11KV SHAGARI HADEJIA INJECTION SUBSTATION SHAGARI QUARTERS AND GRA HADEJIA 16
B 11KV SHARADA INDUSTRIAL SHARADA INJECTION SUBSTATION GIDAN MAZA, MEDILE AND SABUWAR GANDU AREA. 16
B 11KV TAKUR DUTSE NIPP INJECTION SUBSTATION TAKUR HOUSING ESTATE AND POLICE HEAD QUARTERS. 16
B 11KV TARAUNI FARM CENTER INJECTION SUBSTATION TARAUNI AND DAURAWA QUARTERS. 16
B 11KV YANKABA KAWAJI INJECTION SUBSTATION KAWAJI, YANKABA HADEJIA ROAD. 16
B 11KV YANLEMO NAIBAWA INJECTION SUBSTATION NAIBAWA ZARIA ROAD AND YANKATAKO AREA AND MAIKALWA AREA. 16
B 33KV AMPRI GLOBAL KANKIA TS AMPRI GLOBAL KANKIA AND ZONE WATER TREATMENT PLANT, DUTSINMA 16
B 33KV BUK DAN AGUNDI TS BUK ROAD, TUDUN YOLA AND R/ZAKI AREA. 16
B 33KV GAGARAWA GAGARAWA TS GAGARAWA TOWN ALONG HADEJIA ROAD. 16
B 33KV IDH DAKATA TS FRANCE ROAD, KANO 16
B 33KV KAITA KATSINA TS KAITA, DANKAMA, MAKURDA AND HIGH COURT, KATSINA. 16
B 33KV MAMMAN NASIR FUNTUA TS FUNTUA ROAD, MALUMFASHI INJECTION SUBSTATION. 16
B 33KV MUSAWA KANKIA TS KUSADA, JIKAMSHI, TSANYAWA AND GHARI. 16
B 33KV RIJIYAR ZAKI TAMBURAWA TS KUYAN TA INNA MADOBI ROAD, DANBARE, BUK NEW SITE AND R/ZAKI AREA. 16
C 11KV AMINU KANO GORON DUTSE INJECTION SUBSTATION KOFAR KANKASALI ROAD, TUDUN YOLA, BAJALLABE AND RIMIN ZAKARA AREA. 12
C 11KV BACHIRAWA BUKAVU INJECTION SUBSTATION KURNA AND RIJIYAR LEMO AREAS 12
C 11KV BCGA MALUMFASHI INJECTION SUBSTATION BCGA, MALUMFASHI, KATSINA 12
C 11KV BICHI TOWN BICHI INJECTION SUBSTATION BICHI MINI STADIUM, HAGAGAWA, FCE BICHI ROAD AND BICHI GENERAL HOSPITALS. 12
C 11KV CAMPUS LAW SCHOOL INJECTION SUBSTATION LAW SCHOOL CAMPUS BAGAUDA. 12
C 11KV CITY DAN AGUNDI INJECTION SUBSTATION EMIRS PALACE ROAD, DISO ROAD. 12
C 11KV DANTUNKU KAZAURE INJECTION SUBSTATION KAZAURE METROPOLITAN 12
C 11KV DUTSEN REME KATSINA ROAD INJECTION SUBSTATION DDUTIES REME, AREA, 12
C 11KV DUTSEN SAFE KOFAR GUGA INJECTION SUBSTATION DUTSEN SAFE LOW COST, SABON GIDA AND FILIN SUKUWA 12
C 11KV FAGGE IDH INJECTION SUBSTATION FAGGE AND KOFAR WAMBAI AND ZAGE AREA. 12
C 11KV FARAWA MARIRI INJECTION SUBSTATION MARIRI, FARAWA AND GERAWA AREA. 12
C 11KV FEDERAL SECRETARIAT BUKAVU INJECTION SUBSTATION GWAMMAJA HOUSING ESTATE, YAN RODI AND KWANAR TAYA AREA. 12
C 11KV FMC KOFAR GUGA INJECTION SUBSTATION KOFAR YANDAKA AND BEHIND FMC KATSINA. 12
C 11KV GALADIMA MALUMFASHI INJECTION SUBSTATION GALADIMA ROAD, MALUMFASHI, KATSINA. 12
C 11KV GRA IBB WAY INJECTION SUBSTATION GIDA DAWA, NYSC CAMP AND KWADO 12
C 11KV HOSPITAL ROAD KOFAR GUGA INJECTION SUBSTATION KOFAR GUGA, GAMBARAWA AND CPS KATSINA. 12
C 11KV HOTORO ZARIA ROAD INJECTION SUBSTATION HOTORO MAIDUGURI ROAD AND TINSHAMA AREA. 12
C 11KV JABIRI KATSINA ROAD INJECTION SUBSTATION JABIRI AREA, FUNTUA 12
C 11KV KANO ROAD IBB WAY INJECTION SUBSTATION IBB WAY, GORON GIDA AND RAFIN DADI 12
C 11KV KANTI KAZAURE INJECTION SUBSTATION KAZAURE METROPOLITAN 12
C 11KV KOFAR NAISA DAN AGUNDI INJECTION SUBSTATION KOFAR NAISA, GSS GWALE ROAD AND FILIN MUSHE. 12
C 11KV KOFAR NASSARAWA DAN AGUNDI INJECTION SUBSTATION KOFAR NASSARAWA AND YAKASAI AREAS 12
C 11KV KUNDILA ZARIA ROAD INJECTION SUBSTATION KUNDILA HOUSING ESTATE MAIDUGURI ROAD. 12
C 11KV LAMIDO CLUB INJECTION SUBSTATION LAMIDO ROAD, BADAWA AND KAWO AREA. 12
C 11KV LAUTAI GUMEL INJECTION SUBSTATION GUMEL EMIRS PALACE ROAD AND MAIGATARI AREA. 12
C 11KV LIMAWA DUTSE INJECTION SUBSTATION LIMAWA, GALMAWA AND GGC TILES. 12
C 11KV MAIDUGURI ROAD MARIRI INJECTION SUBSTATION HOTORO MAIDUGURI ROAD AND TINSHAMA AREA. 12
C 11KV MAKAMA WUDIL INJECTION SUBSTATION WUDIL TOWN AREA. 12
C 11KV MARHABA ZARIA ROAD INJECTION SUBSTATION COURT ROAD GYADI GYADI AND ZOO ROAD HOUSING ESTATE. 12
C 11KV MUHAMMED DIKKO KOFAR SAURI INJECTION SUBSTATION MUHD DISKO ROAD, KATSINA EMIR'S PLACE AND TUDUN WADA, KATSINA 12
C 11KV MUNDADU GONGONI INJECTION SUBSTATION MUNDADU AND KWARIN BARKA AREA. 12
C 11KV NAGOGGO FADAMA INJECTION SUBSTATION NAGOGGO ROAD AND SABUWAR UNGUWA, KATSINA 12
C 11KV NAKOWA KATSINA ROAD INJECTION SUBSTATION NOKOWA AREA, FUNTUA 12
C 11KV NATSINTA KOFAR GUGA INJECTION SUBSTATION NATSINTA BARRACK, KATSINA 12
C 11KV ORTHOPAEDIC BUKAVU INJECTION SUBSTATION KOFAR RUWA, AMINU KANO WAY AND GORON DUTSE AREAS. 12
C 11KV PANSHEKARA CHALAWA INJECTION SUBSTATION PANSHEKARA AND KUMBOTSO AREA. 12
C 11KV SALLARI ZARIA ROAD INJECTION SUBSTATION SALLARI, SHEKA YARKASUWA AND ACI LAFIYA AREA. 12
C 11KV SANI MAINAGGE GORON DUTSE INJECTION SUBSTATION SANI MAINAGGE AND MANDAWARI AREA. 12
C 11KV SCHOOL OF NURSING BIRNIN KUDU INJECTION SUBSTATION SCHOOL OF NURSING AND PRISON FARM HOUSE ALONG MAIDUGURI ROAD. 12
C 11KV TIGA LAW SCHOOL INJECTION SUBSTATION BEBEJI AND TIGA TOWN. 12
C 11KV TOWN KATSINA ROAD INJECTION SUBSTATION DUTSEN REME AREA, FUNTUA 12
C 11KV TUKUNTAWA SHARADA INJECTION SUBSTATION TUKUNTAWA AND SHAGARI QUARTERS. 12
C 11KV UNGUWA UKU ZARIA ROAD INJECTION SUBSTATION UNGUWA UKU, NAIBAWA DANHASSAN LINE. 12
C 11KV ZAWACIKI ABATTOIR INJECTION SUBSTATION ALMUKAB HOUSING ESTATE, ZAWACHIKI AND GAIDA AREA. 12
C 33KV DANBATTA KANKIA TS CHARANCHI, BINDAWA, INGAWA, RONI GWIWA AND DANBATTA 12
C 33KV DUTSINMA KANKIA TS KANKIA METROPOLITAN, RADDA, DUTSINMA, KURFI, SAFANA AND DANMUSA 12
C 33KV FALGORE DANGORA TS FALGORE, GIDAN KWANO AND YALWAN PAKI AREA. 12
C 33KV GAIDA KUMBOTSO TS GAIDA AND ZAWACHIKI HOUSING ESTATE. 12
C 33KV GANO WUDIL TS GANO MAIDUGURI ROAD, MAKOLE, MARIRI AREA. 12
C 33KV GUMEL HADEJIA TS MALAM MADORI AND DANTANOMA AND GUMEL PALACE 12
C 33KV HON. ABUBAKAR BICHI TS BICHI METROPOLITAN 12
C 33KV KARAYE DANGORA TS KWANAR DANGORA, KIRU AND KARAYE TOWN. 12
C 33KV KAZAURE DAURA TS DAURA ROAD, KAZAURE INJECTION SUBSTATION 12
C 33KV MASHI DAURA TS KAGAWA, MASHI, DUTSI AND MANI 12
C 33KV WATARI BICHI TS WATARI WATER TREATMENT PLANT, BAGWAI AND SHANONO 12
D 11KV ARMY BARRACKS IBB WAY NIPP INJECTION SUBSTATION KOFAR KWAYA, YAHAYA MADAKI WAY AND RAHAMAWA. 8
D 11KV CHIRANCI GONGONI INJECTION SUBSTATION DORAYI SHIEK JAFAR MAHMUD ROAD AND CHIRANCI AREAS. 8
D 11KV FANISAU BUKAVU INJECTION SUBSTATION FANISAU ROAD, UNGOGO TOWN AND BACHIRAWA AREAS. 8
D 11KV GWAGWARWA BRISCOE INJECTION SUBSTATION GWAGWARWA, YANKAJI AND KWANAR JABA AREA. 8
D 11KV GWAMMAJA IDH INJECTION SUBSTATION GWAMMAJA AND ADAKAWA AREA. 8
D 11KV JAEN GONGONI INJECTION SUBSTATION JAEN AND SHAGO TARA AREAS. 8
D 11KV JAKARA GORON DUTSE INJECTION SUBSTATION GORON DUTSE PRISON ROAD AND JAKARA AREA. 8
D 11KV JAMAARE HADEJIA NIPP INJECTION SUBSTATION HADEJIA TOWN. 8
D 11KV KAURA GOJE PRP INJECTION SUBSTATION KAURA GOJE AND KWANA HUDU AREA. 8
D 11KV KOFAR FADA MUSAWA INJECTION SUBSTATION MUSAWA METROPOLITAN 8
D 11KV KOKI IDH INJECTION SUBSTATION KOKI AND BAKIN ZUWO AREAS. 8
D 11KV MAKWALLA MALAN MADORI INJECTION SUBSTATION MALAM MADORI TOWN. 8
D 11KV MATAZU MUSAWA INJECTION SUBSTATION MATAZU METROPOLITAN 8
D 11KV RIMIN KEBE SMALL SCALE INJECTION SUBSTATION RIMIN KEBE AND ZANGO DAKATA AREA. 8
D 11KV SAGAGI ADO BAYERO INJECTION SUBSTATION SAGAGI AND LOKON MAKERA AREA. 8
D 11KV TALAMIZ JOGANA INJECTION SUBSTATION GUNDUWAWA, KAKARA AND JOGANA AREA. 8
D 11KV TSAMIYA BABBA JOGANA INJECTION SUBSTATION TOKARAWA, GUNDUWAWA AND BABAWA AREA ALONG HADEJIA ROAD. 8
D 11KV TUDUN MURTALA SMALL SCALE INJECTION SUBSTATION TUDUN MURTALA AND TAGARJI AREAS. 8
D 11KV TUDUN WADA BRISCOE INJECTION SUBSTATION GAMA AND GAWAUNA AREA BRIGADE. 8
D 33KV BAGAUDA KUMBOTSO TS KUMBOTSO LGA, YANKUSA, DANGWAURO, KWANAR DAWAKI AND BUNKURE AREA. 8
D 33KV BIRNIWA HADEJIA TS BIRNIWA AND TARUBU AND GARIN MAGAJI AREA. 8
D 33KV GUJUNGU TAMBURAWA TS ENTIRE GUJUNJU TOWN 8
D 33KV JAHUN DUTSE TS KARNAYA, CHAI CHAI, RINGIM AND TAURA TOWN. 8
D 33KV MALUMFASHI FUNTUA TS BAKORI, KAFUR, DANA AND KANKARA 8
D 33KV POLYTECHNIC KATSINA TS RIMI AND BATAGARAWA 8
D 33KV SUMAILA DUTSE TS MOBILE BASE DANMASARA, KACHAKO AND PANDA ALONG MAIDUGURI ROAD. 8
E 11KV MAI RUWA TEXTILE INJECTION SUBSTATION ENTIRE MAIRUWA TOWN, KATSINA. 4
E 33KV DANDUME FUNTUA TS ENTIRE DANDUME TOWN AND SABUWA 4
E 33KV DAWANAU BUKAVU INJECTION SUBSTATION POLEWIRE LINE, JAJIRA, KATSINAWA AND DAWANAU AREAS. 4
E 33KV GARKO WUDIL TS INDABO, KWANAR SUMAILA, TAKAI AND GARKO TOWN. 4
E 33KV GAYA WUDIL INJECTION SUBSTATION GAYA, KADEMI AND AJINGI TOWN. 4
E 33KV GEZAWA SMALL SCALE INJECTION SUBSTATION ZAURAN DANBUZU, ZANGO DAKATA, RANGAZA, GEZAWA AND KUNYA TOWN. 4
E 33KV KWANKWASO TAMBURAWA TS GARU, LAMBU, RIMIN GADO AND GWARZO TOWN. 4
E 33KV MAI ADUA DAURA TS MAI ADUA`;

// Locations to exclude (non-Kano)
const EXCLUDED_LOCATIONS = [
    "KATSINA", "JIGAWA", "DAURA", "FUNTUA", "MUSAWA", "KAZAURE", "KANKIA",
    "DUTSE", "HADEJIA", "BIRNIN KUDU", "MALUMFASHI", "DUTSINMA", "GUMEL",
    "BINDAWA", "INGAWA", "RONI", "GWIWA", "DANBATTA", "RADDA", "KURFI",
    "SAFANA", "DANMUSA", "CHARANCHI", "BIRNIWA", "TARUBU", "GARIN MAGAJI",
    "KARNAYA", "CHAI CHAI", "RINGIM", "TAURA", "BAKORI", "KAFUR", "DANA",
    "KANKARA", "RIMI", "BATAGARAWA", "DANMASARA", "KACHAKO", "PANDA",
    "DANDUME", "SABUWA", "KADEMI", "AJINGI", "GEZAWA", "KUNYA", "MAI ADUA"
];

// Parse feeder data
function parseFeederData(rawData) {
    const lines = rawData.trim().split("\n");
    const feeders = [];

    for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        
        // Skip lines that don't have at least band and voltage
        if (parts.length < 3) continue;
        
        const band = parts[0];
        const voltage = parts[1];
        
        // Find where "INJECTION" or "TS" starts
        let substationStart = -1;
        for (let i = 2; i < parts.length; i++) {
            if (parts[i].toUpperCase().includes("INJECTION") || parts[i].toUpperCase().includes("TS")) {
                substationStart = i;
                break;
            }
        }
        
        // Extract feeder name
        const feederNameParts = substationStart > -1 ? parts.slice(2, substationStart) : parts.slice(2);
        let feederName = feederNameParts.join(" ").trim();
        
        // Clean feeder name - remove trailing numbers
        feederName = feederName.replace(/\s+\d+$/, "").trim();
        
        // If name is empty (like for "A 11KV NUHU SUNUSI 20"), use whatever we can
        if (!feederName) {
            feederName = parts.slice(2, -1).join(" ");
        }
        
        // Check if this feeder is for Kano only (not excluded)
        const lineUpper = line.toUpperCase();
        const hasExcluded = EXCLUDED_LOCATIONS.some(loc => lineUpper.includes(loc));
        
        // Include only Kano feeders - if it mentions Kano or no excluded locations
        const isKano = lineUpper.includes("KANO") || !hasExcluded;
        
        if (isKano && feederName) {
            feeders.push({
                name: feederName,
                band,
                voltage,
                fullLine: line
            });
        }
    }
    
    return feeders;
}

// Find matching communities from communityLookup for a given feeder description
function findMatchingCommunities(line) {
    const lineLower = line.toLowerCase();
    const matches = new Set();
    
    // Check community names
    for (const [communityKey, communityData] of Object.entries(communityLookup)) {
        if (lineLower.includes(communityKey)) {
            for (const comm of communityData) {
                matches.add(JSON.stringify(comm));
            }
        }
    }
    
    return Array.from(matches).map(s => JSON.parse(s));
}

async function importFeederCoverage() {
    try {
        await connectDB();
        console.log("✅ Connected to MongoDB");
        
        // Clear existing coverage to start fresh
        await FeederCoverage.deleteMany({});
        
        // Get all Kano feeders
        const feeders = await Feeder.find().lean();
        console.log(`✅ Found ${feeders.length} feeders in database`);
        
        // Get all Kano wards for easy lookup
        const wards = await Ward.find().lean();
        const wardMap = new Map();
        wards.forEach(w => {
            if (w.id) wardMap.set(w.id, w);
            if (w.slug) wardMap.set(w.slug, w);
        });
        
        // Get all LGAs
        const lgas = await LGA.find().lean();
        const lgaMap = new Map();
        lgas.forEach(l => {
            lgaMap.set(l.name, l);
            lgaMap.set(l.slug, l);
        });
        
        // Parse our feeder data from the PDF
        const parsedFeeders = parseFeederData(RAW_FEEDER_DATA);
        
        console.log(`✅ Parsed ${parsedFeeders.length} Kano-specific feeders from KEDCO schedule`);
        
        // Process each feeder from the PDF
        let coverageCount = 0;
        
        for (const parsedFeeder of parsedFeeders) {
            // Find matching feeder in DB (by name)
            const dbFeeder = feeders.find(f => 
                f.name.toLowerCase().includes(parsedFeeder.name.toLowerCase()) || 
                parsedFeeder.name.toLowerCase().includes(f.name.toLowerCase())
            );
            
            if (dbFeeder) {
                // Find communities this feeder serves
                const communities = findMatchingCommunities(parsedFeeder.fullLine);
                
                // Also check LGA/ward mentions
                const wardMatches = [];
                for (const lgaName of ["kano municipal", "nasarawa", "dawakin kudu", "dawakin tofa", "bichi", "gwarzo", "bebeji", "kumbotso", "ungogo", "warawa", "wudil", "sharada", "dakata", "bompai", "gwale", "fagge", "tarauni", "bagwai"]) {
                    if (parsedFeeder.fullLine.toLowerCase().includes(lgaName)) {
                        // Find all wards in that LGA
                        const lgaWards = wards.filter(w => w.lgaName.toLowerCase().includes(lgaName));
                        wardMatches.push(...lgaWards);
                    }
                }
                
                // Create coverage records using upsert to avoid duplicates
                // First by community
                for (const comm of communities) {
                    // Find ward for this community (if any)
                    const ward = comm.communityId ? wardMap.get(comm.communityId) : null;
                    const lga = lgaMap.get(comm.lga);
                    
                    await FeederCoverage.findOneAndUpdate(
                        { feederId: dbFeeder._id, communityId: comm.communityId },
                        {
                            $set: {
                                wardId: ward?._id || null,
                                lgaId: lga?._id || null,
                                substationId: dbFeeder.injectionSubstationId || null,
                                source: "KEDCO Master Schedule",
                                status: "active"
                            }
                        },
                        { upsert: true, new: true }
                    );
                    
                    coverageCount++;
                }
                
                // Add by ward if no communities found
                if (communities.length === 0 && wardMatches.length > 0) {
                    for (const ward of wardMatches.slice(0, 3)) { // Limit to 3 per feeder for scope
                        await FeederCoverage.findOneAndUpdate(
                            { feederId: dbFeeder._id, wardId: ward._id },
                            {
                                $set: {
                                    communityId: null,
                                    lgaId: ward.lga,
                                    substationId: dbFeeder.injectionSubstationId || null,
                                    source: "KEDCO Master Schedule",
                                    status: "active"
                                }
                            },
                            { upsert: true, new: true }
                        );
                        
                        coverageCount++;
                    }
                }
                
                // If no matches at all, create basic coverage (only once per feeder)
                if (communities.length === 0 && wardMatches.length === 0) {
                    const existing = await FeederCoverage.findOne({
                        feederId: dbFeeder._id,
                        communityId: null,
                        wardId: null
                    });
                    
                    if (!existing) {
                        const coverage = new FeederCoverage({
                            feederId: dbFeeder._id,
                            communityId: null,
                            wardId: null,
                            lgaId: null,
                            substationId: dbFeeder.injectionSubstationId || null,
                            source: "KEDCO Master Schedule",
                            status: "active"
                        });
                        
                        await coverage.save();
                        coverageCount++;
                    }
                }
            }
        }
        
        console.log(`✅ Created ${coverageCount} FeederCoverage records`);
        
        // Generate validation report
        await generateValidationReport();
        
        // Generate final kanoPowerNetwork.json
        await generateKanoPowerNetwork();
        
        await mongoose.disconnect();
    } catch (error) {
        console.error("❌ Import failed:", error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

async function generateValidationReport() {
    console.log("\n📊 VALIDATION REPORT");
    console.log("=".repeat(50));
    
    const totalFeeders = await Feeder.countDocuments();
    const totalCommunities = Object.keys(communityLookup).length;
    const totalCoverage = await FeederCoverage.countDocuments();
    
    const feedersWithCoverage = await FeederCoverage.distinct("feederId");
    const feedersWithoutCoverage = totalFeeders - feedersWithCoverage.length;
    
    const duplicateCoverage = await FeederCoverage.aggregate([
        { $group: { _id: { feederId: "$feederId", communityId: "$communityId" }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
    ]);
    
    console.log(`✅ Total Feeders: ${totalFeeders}`);
    console.log(`✅ Total Communities (in lookup): ${totalCommunities}`);
    console.log(`✅ Total Coverage Records: ${totalCoverage}`);
    console.log(`✅ Feeders With Coverage: ${feedersWithCoverage.length}`);
    console.log(`⚠️ Feeders Without Coverage: ${feedersWithoutCoverage}`);
    console.log(`✅ Duplicate Coverage Records: ${duplicateCoverage.length}`);
}

async function generateKanoPowerNetwork() {
    console.log("\n📦 Generating kanoPowerNetwork.json...");
    
    // Load all data
    const state = await State.findOne({ name: "Kano" }).lean();
    const lgas = await LGA.find({ state: state._id }).lean();
    const wards = await Ward.find({ state: state._id }).lean();
    const substations = await InjectionSubstation.find({ stateId: state._id }).lean();
    const feeders = await Feeder.find().lean();
    const coverage = await FeederCoverage.find().lean();
    
    // Build structure
    const networkData = {
        version: "1.0.0",
        source: "KEDCO Master Schedule & communityLookup.json",
        generatedAt: new Date().toISOString(),
        state,
        lgas,
        wards,
        injectionSubstations: substations,
        feeders,
        coverage,
        bands: ["A", "B", "C", "D", "E"]
    };
    
    const outputPath = path.join(__dirname, "../data/kanoPowerNetwork.json");
    fs.writeFileSync(outputPath, JSON.stringify(networkData, null, 2));
    console.log(`✅ Saved to ${outputPath}`);
}

importFeederCoverage();
