
import express from "express";
import { adminTest, createAdmin } from "../controllers/adminController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/rolemiddleware.js";

const router = express.Router();

// All admin routes are protected
router.use(protect);

router.get("/test", authorize("super-admin", "admin"), adminTest);
router.post("/create-admin", authorize("super-admin"), createAdmin);

export default router;




