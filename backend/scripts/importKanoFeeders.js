import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

import Feeder from "../models/Location/Feeder.js";
import Ward from "../models/Location/Ward.js";
import LGA from "../models/Location/LGA.js";
import State from "../models/Location/State.js";
import InjectionSubstation from "../models/Location/InjectionSubstation.js";
import { slugify } from "../utils/slugGenerator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

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
A 33KV DAN AGUNDI 2 DAN AGUNDI TS DAN AGUNDI INJECTION SUBSTATION, BUK ROAD, KANO 20
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
A 33KV ZARIA ROAD DAN AGUNDI TS AKTH,NA'IBAWA, ZARIA ROAD KANO 20
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
C 11KV CITY DAN AGUNDI INJECTION SUBSTATION EMIRS' PALACE ROAD, DISO ROAD. 12
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
C 11KV MUHAMMED DIKKO KOFAR SAURI INJECTION SUBSTATION MUHD DISCO ROAD, KATSINA EMIR'S PLACE AND TUDUN WADA, KATSINA 12
C 11KV MUNDADU GONGONI INJECTION SUBSTATION MUNDADU AND KWARIN BARKA AREA. 12
C 11KV NAGOGGO FADAMA INJECTION SUBSTATION NAGOGO ROAD AND SABUWAR UNGUWA, KATSINA 12
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
C 33KV DUTSENMA KANKIA TS KANKIA METROPOLITAN, RADDA, DUTSINMA, KURFI, SAFANA AND DANMUSA 12
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
D 11KV CHIRANCI GONGONI INJECTION SUBSTATION DORAYI SHIEK JAFAR MAHMUD ROAD AND CHIRANCHI AREA. 8
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
E 33KV GEZAWA SMALL SCALE INJECTION SUBSTATION ZAURAN DANBABA, ZANGON DAKATA, RANGAZA, GEZAWA AND KUNYA TOWN. 4
E 33KV KWANKWASO TAMBURAWA TS GARU, LAMBU, RIMIN GADO AND GWARZO TOWN. 4
E 33KV MAI ADUA DAURA TS MAI ADUA`;

const EXCLUDED_LOCATIONS = [
  'KATSINA', 'JIGAWA', 'DAURA', 'FUNTUA', 'MUSAWA', 'KAZAURE', 'KANKIA', 
  'DUTSE', 'HADEJIA', 'BIRNIN KUDU', 'MALUMFASHI', 'DUTSINMA', 'GUMEL',
  'BINDAWA', 'INGAWA', 'RONI', 'GWIWA', 'DANBATTA', 'RADDA', 'KURFI', 
  'SAFANA', 'DANMUSA', 'CHARANCHI', 'BIRNIWA', 'TARUBU', 'GARIN MAGAJI',
  'KARNAYA', 'CHAI CHAI', 'RINGIM', 'TAURA', 'BAKORI', 'KAFUR', 'DANA',
  'KANKARA', 'RIMI', 'BATAGARAWA', 'DANMASARA', 'KACHAKO', 'PANDA',
  'DANDUME', 'SABUWA', 'KADEMI', 'AJINGI', 'GEZAWA', 'KUNYA', 'MAI ADUA'
];

const STOP_WORDS = new Set([
  'road','roads','way','ways','street','streets','st','rd','avenue','ave','lane','ln',
  'area','areas','town','towns','city','cities','industrial','plant','metropolitan',
  'estate','hospital','campus','quarter','quarters','court','line','station','office',
  'market','hotel','school','university','mall','junction','expressway','state','barracks',
  'injection','substation','sub','station','ts','nipp','roadand','wayand','along','near','by','within',
  'into','from','to','of','the','a','an','and','&','at','kano'
]);

const LOOKUP_FILE = path.join(__dirname, 'communityLookup.json');
const GEOCODE_CACHE_FILE = path.join(__dirname, 'geocode_cache.json');

let geocodeCache = {};
if (fs.existsSync(GEOCODE_CACHE_FILE)) {
  try {
    geocodeCache = JSON.parse(fs.readFileSync(GEOCODE_CACHE_FILE, 'utf8'));
  } catch (err) {
    geocodeCache = {};
  }
}

const saveGeocodeCache = () => fs.writeFileSync(GEOCODE_CACHE_FILE, JSON.stringify(geocodeCache, null, 2));

const communityLookup = JSON.parse(fs.readFileSync(LOOKUP_FILE, 'utf8'));
const communityIndex = new Map();
for (const [key, entries] of Object.entries(communityLookup)) {
  communityIndex.set(key, entries);
}

function normalizeLookupKey(value) {
  if (!value || typeof value !== 'string') return '';
  return value
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function normalizePhrase(value) {
  if (!value || typeof value !== 'string') return '';
  return value
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildCandidateKeys(segment) {
  const normalized = normalizePhrase(segment);
  if (!normalized) return [];

  const words = normalized.split(' ').filter(Boolean);
  if (words.length === 0) return [];

  const keys = new Set();
  const compact = words.join('');
  if (compact) keys.add(compact);

  const compactNoStop = words.filter((w) => !STOP_WORDS.has(w)).join('');
  if (compactNoStop) keys.add(compactNoStop);

  for (let len = words.length; len >= 1; len--) {
    for (let start = 0; start + len <= words.length; start++) {
      const slice = words.slice(start, start + len).filter((w) => !STOP_WORDS.has(w));
      const key = slice.join('');
      if (key) keys.add(key);
    }
  }

  return [...keys].filter(Boolean);
}

function getLgaHint(text, kanoLgas) {
  if (!text || !kanoLgas?.length) return null;
  const upperText = text.toUpperCase();
  for (const lga of kanoLgas) {
    const upperLga = lga.toUpperCase();
    if (upperText.includes(upperLga)) {
      return lga;
    }
  }
  return null;
}

function matchesExcludedLocation(text) {
  if (!text) return false;
  const upperText = text.toUpperCase();
  return EXCLUDED_LOCATIONS.some((loc) => upperText.includes(loc));
}

function extractFeederParts(line) {
  const cleaned = line.trim().replace(/\.+$/, '').trim();
  const feederMatch = cleaned.match(/^(?<band>[A-E])\s+(?<voltage>11KV|33KV)\s+(?<rest>.+?)\s+(?<hours>\d+)$/i);
  if (!feederMatch) return null;

  const band = feederMatch.groups.band.toUpperCase();
  const voltageLevel = feederMatch.groups.voltage.toUpperCase();
  const rawText = feederMatch.groups.rest.trim();

  let name = rawText;
  let injectionSubstation = '';
  let location = '';

  const injectionMatch = rawText.match(/^(?<left>.+?)\s+(?:INJECTION\s+SUBSTATION|INJECTION\s+SUSTATION|SUB\s+STATION)\s*(?<right>.*)$/i);
  if (injectionMatch) {
    name = injectionMatch.groups.left.replace(/\b(11KV|33KV)\b/gi, '').trim();
    injectionSubstation = `${injectionMatch.groups.left.trim()} Injection Substation`;
    location = injectionMatch.groups.right.trim();
  } else {
    const tsMatch = rawText.match(/^(?<left>.+?)\s+TS\s*(?<right>.*)$/i);
    if (tsMatch) {
      name = tsMatch.groups.left.replace(/\b(11KV|33KV)\b/gi, '').trim();
      injectionSubstation = `${tsMatch.groups.left.trim()} TS`;
      location = tsMatch.groups.right.trim();
    } else {
      name = rawText.replace(/\b(11KV|33KV)\b/gi, '').trim();
      location = '';
      injectionSubstation = '';
    }
  }

  if (!name) name = rawText;

  return { band, voltageLevel, rawText, name: name.trim(), injectionSubstation: injectionSubstation.trim(), location: location.trim() };
}

function filterKanoFeeders(feeders, kanoLgas) {
  return feeders.filter((feeder) => {
    const combinedText = `${feeder.name} ${feeder.location}`.toUpperCase();
    if (matchesExcludedLocation(combinedText)) return false;
    if (combinedText.includes('KANO')) return true;
    return kanoLgas.some((lga) => combinedText.includes(lga.toUpperCase()));
  });
}

async function geocode(query) {
  if (!query) return null;
  if (geocodeCache[query]) return geocodeCache[query];
  try {
    const res = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: query, format: 'json', limit: 1 },
      headers: { 'User-Agent': 'Litha/1.0 (KanoFeedersImport)' },
      timeout: 8000
    });
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      const [item] = res.data;
      const coords = { latitude: Number(item.lat), longitude: Number(item.lon) };
      geocodeCache[query] = coords;
      saveGeocodeCache();
      return coords;
    }
  } catch (error) {
    // swallow network errors but keep cache for next run
  }
  return null;
}

function buildFeederUniqueId(index) {
  return `FDR-KAN-${String(index + 1).padStart(4, '0')}`;
}

function getBandColor(band) {
  const colors = {
    A: '#22c55e',
    B: '#3b82f6',
    C: '#f59e0b',
    D: '#ef4444',
    E: '#6b7280'
  };
  return colors[band] || '#6b7280';
}

async function ensureUniqueFeederSlug(baseSlug) {
  let slug = baseSlug;
  let counter = 1;
  while (await Feeder.findOne({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
  return slug;
}

async function getOrCreateSubstation(name) {
  const slug = slugify(name);
  let substation = await InjectionSubstation.findOne({ slug });
  if (substation) return substation;

  const uniqueId = `SUB-KAN-${slug.replace(/[^a-z0-9]+/gi, '-').toUpperCase()}`;
  substation = await InjectionSubstation.create({ name, slug, uniqueId });
  return substation;
}

function getNormalizedSegmentCandidates(text) {
  const segments = text
    .split(/[,&]/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const expanded = [];
  for (const segment of segments) {
    const parts = segment.split(/\band\b/i).map((s) => s.trim()).filter(Boolean);
    expanded.push(...parts);
  }
  return expanded.map((s) => s.replace(/\.+$/, '').trim()).filter(Boolean);
}

function findCommunityEntries(segment, lgaHint) {
  const candidateKeys = buildCandidateKeys(segment);
  if (candidateKeys.length === 0) return [];

  const matches = new Map();
  for (const key of candidateKeys) {
    const entries = communityIndex.get(key);
    if (!entries) continue;

    const filtered = lgaHint
      ? entries.filter((entry) => entry.lga.toLowerCase() === lgaHint.toLowerCase())
      : entries;

    for (const entry of (filtered.length ? filtered : entries)) {
      matches.set(entry.communityId, entry);
    }
  }

  return Array.from(matches.values());
}

function calculateCentroid(coords) {
  if (!coords.length) return null;
  const valid = coords.filter((c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude));
  if (valid.length === 0) return null;
  const latitude = valid.reduce((sum, c) => sum + c.latitude, 0) / valid.length;
  const longitude = valid.reduce((sum, c) => sum + c.longitude, 0) / valid.length;
  return { latitude, longitude };
}

function buildInjectionSubstationName(rawName) {
  const cleaned = rawName.replace(/\b(injection\s+substation|injection\s+sustation|sub\s+station)\b/gi, '').trim();
  if (!cleaned) return rawName;
  return `${cleaned} Injection Substation`;
}

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MongoDB URI missing. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(uri);

  const state = await State.findOne({ name: 'Kano' });
  if (!state) {
    console.error('State Kano is missing in DB. Aborting.');
    process.exit(1);
  }

  const kanoLgas = (await LGA.find({ state: state._id }).lean()).map((l) => l.name);
  const feeders = RAW_FEEDER_DATA.trim().split('\n').map((line) => line.trim()).filter(Boolean);

  const parsed = feeders.map((line, index) => {
    const parts = extractFeederParts(line);
    if (!parts) return null;
    return {
      ...parts,
      lineNumber: index + 1,
      uniqueId: buildFeederUniqueId(index),
      sourceText: line
    };
  }).filter(Boolean);

  const kanoFeeders = filterKanoFeeders(parsed, kanoLgas);

  const report = {
    totalProcessed: kanoFeeders.length,
    imported: 0,
    updated: 0,
    skipped: 0,
    duplicateNamesDetected: 0,
    coordinatesGenerated: 0,
    coordinatesGeocoded: 0,
    missingCommunities: [],
    invalidRecords: [],
    duplicateSlugs: 0,
    communityMappings: 0
  };

  const seenSlugs = new Set();

  for (const feeder of kanoFeeders) {
    const lineText = `${feeder.name} ${feeder.location}`.trim();
    const lgaHint = getLgaHint(lineText, kanoLgas);

    const segmentCandidates = getNormalizedSegmentCandidates(`${feeder.location} ${feeder.name}`);
    const matchedEntries = [];
    const seenCommunityIds = new Set();

    for (const candidate of segmentCandidates) {
      const entries = findCommunityEntries(candidate, lgaHint);
      for (const entry of entries) {
        if (!seenCommunityIds.has(entry.communityId)) {
          seenCommunityIds.add(entry.communityId);
          matchedEntries.push(entry);
        }
      }
    }

    if (matchedEntries.length === 0) {
      report.missingCommunities.push({ feeder: feeder.name, location: feeder.location, lineNumber: feeder.lineNumber });
      report.skipped += 1;
      continue;
    }

    const wardDocs = [];
    for (const entry of matchedEntries) {
      let ward = await Ward.findOne({ id: entry.communityId });
      if (!ward) {
        // Fallback: try to find by slug if no direct ID match
        ward = await Ward.findOne({ slug: entry.slug });
      }
      if (ward) wardDocs.push(ward);
      else {
        report.missingCommunities.push({ feeder: feeder.name, communityId: entry.communityId, slug: entry.slug, lineNumber: feeder.lineNumber });
      }
    }

    const communityIds = [...new Set(wardDocs.map((ward) => String(ward._id)))].map((id) => new mongoose.Types.ObjectId(id));
    if (communityIds.length === 0) {
      report.invalidRecords.push({ feeder: feeder.name, reason: 'No matching ward documents for community lookup', lineNumber: feeder.lineNumber });
      report.skipped += 1;
      continue;
    }

    const wardCoords = wardDocs.map((ward) => {
      const latitude = ward.latitude || ward.coordinates?.latitude || null;
      const longitude = ward.longitude || ward.coordinates?.longitude || null;
      return { latitude, longitude };
    }).filter((coord) => Number.isFinite(coord.latitude) && Number.isFinite(coord.longitude));

    let coordinates = calculateCentroid(wardCoords);

    if (!coordinates) {
      const geocodeQuery = `${feeder.name} ${feeder.location}, Kano, Nigeria`;
      const geoResult = await geocode(geocodeQuery);
      if (geoResult) {
        coordinates = geoResult;
        report.coordinatesGeocoded += 1;
      }
    } else {
      report.coordinatesGenerated += 1;
    }

    if (!coordinates) {
      report.invalidRecords.push({ feeder: feeder.name, reason: 'Unable to compute coordinates', lineNumber: feeder.lineNumber });
      report.skipped += 1;
      continue;
    }

    const injectionSubstationName = feeder.injectionSubstation
      ? buildInjectionSubstationName(feeder.injectionSubstation)
      : `${feeder.name} Injection Substation`;

    const substation = await getOrCreateSubstation(injectionSubstationName);

    let baseSlug = slugify(feeder.name);
    if (!baseSlug) baseSlug = `feeder-${feeder.lineNumber}`;
    let feederSlug = baseSlug;
    if (seenSlugs.has(feederSlug)) {
      report.duplicateSlugs += 1;
      let counter = 1;
      while (seenSlugs.has(`${baseSlug}-${counter}`)) counter += 1;
      feederSlug = `${baseSlug}-${counter}`;
    }
    feederSlug = await ensureUniqueFeederSlug(feederSlug);
    seenSlugs.add(feederSlug);

    const lgaCounts = wardDocs.reduce((acc, ward) => {
      const lgaId = String(ward.lga);
      acc[lgaId] = (acc[lgaId] || 0) + 1;
      return acc;
    }, {});
    const primaryLgaId = Object.entries(lgaCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const updatePayload = {
      uniqueId: feeder.uniqueId,
      slug: feederSlug,
      name: feeder.name,
      displayName: feeder.name,
      band: feeder.band,
      voltageLevel: feeder.voltageLevel,
      color: getBandColor(feeder.band),
      injectionSubstation: injectionSubstationName,
      injectionSubstationId: substation._id,
      communityIds,
      wardIds: communityIds,
      lgaId: primaryLgaId ? new mongoose.Types.ObjectId(primaryLgaId) : null,
      source: 'KEDCO',
      verificationStatus: 'Verified',
      confidenceScore: 100,
      status: 'active',
      coordinates,
      isActive: true
    };

    const existingFeeder = await Feeder.findOne({ $or: [{ uniqueId: feeder.uniqueId }, { slug: feederSlug }] });
    if (existingFeeder) {
      await Feeder.findByIdAndUpdate(existingFeeder._id, updatePayload, { runValidators: true });
      report.updated += 1;
    } else {
      await Feeder.create(updatePayload);
      report.imported += 1;
    }
    report.communityMappings += communityIds.length;
  }

  const duplicateSlugCounts = Object.values(parsed.reduce((acc, feeder) => {
    const key = slugify(feeder.name) || feeder.uniqueId;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).filter((count) => count > 1).length;
  report.duplicateNamesDetected = duplicateSlugCounts;

  const invalidCount = report.invalidRecords.length + report.missingCommunities.length;

  console.log('\n📋 VALIDATION REPORT');
  console.log('='.repeat(60));
  console.log(`✔ Total feeders processed: ${report.totalProcessed}`);
  console.log(`✔ Imported: ${report.imported}`);
  console.log(`✔ Updated: ${report.updated}`);
  console.log(`✔ Skipped: ${report.skipped}`);
  console.log(`✔ Communities mapped: ${report.communityMappings}`);
  console.log(`✔ Missing community mappings: ${report.missingCommunities.length}`);
  console.log(`✔ Duplicate names detected: ${report.duplicateNamesDetected}`);
  console.log(`✔ Coordinates generated: ${report.coordinatesGenerated}`);
  console.log(`✔ Coordinates fetched from OpenStreetMap: ${report.coordinatesGeocoded}`);
  console.log(`✔ Invalid records: ${invalidCount}`);
  console.log('='.repeat(60));

  if (report.missingCommunities.length > 0) {
    fs.writeFileSync(path.join(__dirname, 'missing_communities.json'), JSON.stringify(report.missingCommunities, null, 2));
  }
  if (report.invalidRecords.length > 0) {
    fs.writeFileSync(path.join(__dirname, 'invalid_feeder_records.json'), JSON.stringify(report.invalidRecords, null, 2));
  }

  await mongoose.disconnect();

  if (report.imported + report.updated === 0 || invalidCount > 0 || report.duplicateSlugs > 0) {
    console.error('❌ Import completed with validation issues. Please review the report files.');
    process.exit(1);
  }

  console.log('✅ Import completed successfully.');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Import failed:', error.message);
  process.exit(1);
});
