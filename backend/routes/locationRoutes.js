import express from "express";
import {
  createState,
  createLGA,
  createWard,
  createFeeder,
  getAllLocations,
  getCountries,
  getActiveCountries,
  createCountry,
  updateCountry,
  toggleCountryStatus,
  deleteCountry,
  getStates,
  getActiveStates,
  updateState,
  toggleStateStatus,
  getLGAs,
  getWards,
  getFeeders,
  searchLocations,
  deleteState,
  deleteLGA,
  deleteWard,
  deleteFeeder,
  updateFeeder,
  createInjectionSubstation,
  getInjectionSubstations,
  updateInjectionSubstation,
  deleteInjectionSubstation
} from "../controllers/locationController.js";
import { protect, softProtect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/rolemiddleware.js";

const router = express.Router();

// Role Protection:
// super-admin -> create state, lga, ward, injection substation
// admin -> create feeder
// user -> cannot create location

router.get("/all", getAllLocations);
router.get("/countries", getCountries);
router.get("/countries/active", getActiveCountries);
router.get("/states", getStates);
router.get("/states/active", getActiveStates);
router.get("/lgas", getLGAs);
router.get("/wards", getWards);
router.get("/search", searchLocations);
router.get("/feeders", softProtect, getFeeders);
router.get("/injection-substations", getInjectionSubstations);

router.post("/countries", protect, authorize("platform-owner"), createCountry);
router.put("/countries/:id", protect, authorize("platform-owner"), updateCountry);
router.patch("/countries/:id/toggle-status", protect, authorize("platform-owner"), toggleCountryStatus);
router.delete("/countries/:id", protect, authorize("platform-owner"), deleteCountry);
router.post("/state", protect, authorize("platform-owner"), createState);
router.post("/states", protect, authorize("platform-owner"), createState);
router.put("/states/:id", protect, authorize("platform-owner"), updateState);
router.patch("/states/:id/toggle-status", protect, authorize("platform-owner"), toggleStateStatus);
router.post("/lga", protect, authorize("super-admin"), createLGA);
router.post("/ward", protect, authorize("super-admin"), createWard);
router.post("/feeder", protect, authorize("super-admin", "admin"), createFeeder);
router.post("/injection-substation", protect, authorize("super-admin"), createInjectionSubstation);
router.put("/feeder/:id", protect, authorize("super-admin"), updateFeeder);
router.put("/injection-substation/:id", protect, authorize("super-admin"), updateInjectionSubstation);

router.delete("/state/:id", protect, authorize("platform-owner"), deleteState);
router.delete("/states/:id", protect, authorize("platform-owner"), deleteState);
router.delete("/lga/:id", protect, authorize("super-admin"), deleteLGA);
router.delete("/ward/:id", protect, authorize("super-admin"), deleteWard);
router.delete("/feeder/:id", protect, authorize("super-admin"), deleteFeeder);
router.delete("/injection-substation/:id", protect, authorize("super-admin"), deleteInjectionSubstation);

export default router;