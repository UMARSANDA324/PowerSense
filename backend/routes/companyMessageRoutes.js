import express from "express";
import {
  sendMessageController,
  sendVoiceMessageController,
  getVoiceAudioStreamController,
  getConversationsController,
  markAsReadController,
  getUnreadCountController,
  getCompanyContactsController
} from "../controllers/companyMessageController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Audio stream endpoint handles authentication via Bearer header OR ?token= query parameter
router.get("/voice/audio/:filename", getVoiceAudioStreamController);

router.use(protect);

router.post("/", sendMessageController);
router.post("/voice", sendVoiceMessageController);
router.get("/", getConversationsController);
router.get("/unread-count", getUnreadCountController);
router.get("/contacts", getCompanyContactsController);
router.put("/:id/read", markAsReadController);

export default router;
