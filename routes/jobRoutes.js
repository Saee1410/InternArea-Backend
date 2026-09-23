import express from "express";
import { createJob, getAllJobs, getJobById } from "../controllers/jobController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";


const router = express.Router();


router.post(
    "/create",
    authMiddleware,
    adminMiddleware,
    createJob
);

router.get("/", getAllJobs);
router.get("/:id", getJobById);


export default router;