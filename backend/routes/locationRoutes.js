import express from "express";
import {
  createState,
  createLGA,
  createWard,
  createFeeder,
  getAllLocations,
  getStates,
  getLGAs,
  getFeeders,
  deleteState,
  deleteLGA,
  deleteWard,
  deleteFeeder,
  updateFeeder
} from "../controllers/locationController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/rolemiddleware.js";

const router = express.Router();

// Role Protection:
// super-admin -> create state, lga, ward
// admin -> create feeder
// user -> cannot create location

router.get("/all", getAllLocations);
router.get("/states", getStates);
router.get("/lgas", getLGAs);
router.get("/feeders", getFeeders);

router.post("/state", protect, authorize("super-admin"), createState);
router.post("/lga", protect, authorize("super-admin"), createLGA);
router.post("/ward", protect, authorize("super-admin"), createWard);
router.post("/feeder", protect, authorize("super-admin", "admin"), createFeeder);
router.put("/feeder/:id", protect, authorize("super-admin"), updateFeeder);

router.delete("/state/:id", protect, authorize("super-admin"), deleteState);
router.delete("/lga/:id", protect, authorize("super-admin"), deleteLGA);
router.delete("/ward/:id", protect, authorize("super-admin"), deleteWard);
router.delete("/feeder/:id", protect, authorize("super-admin"), deleteFeeder);

export default router;