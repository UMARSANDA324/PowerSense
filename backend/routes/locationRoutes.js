import express from "express";
import {
  createState,
  createLGA,
  createWard,
  createFeeder
} from "../controllers/locationController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/rolemiddleware.js";

const router = express.Router();

// Role Protection:
// super-admin -> create state, lga, ward
// admin -> create feeder
// user -> cannot create location

router.post("/state", protect, authorize("super-admin"), createState);
router.post("/lga", protect, authorize("super-admin"), createLGA);
router.post("/ward", protect, authorize("super-admin"), createWard);
router.post("/feeder", protect, authorize("super-admin", "admin"), createFeeder);

export default router;