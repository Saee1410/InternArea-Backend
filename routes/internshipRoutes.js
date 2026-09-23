import express from "express";
import {
    createInternship,
    getAllInternships, 
     getInternshipById, 
       } from "../controllers/internshipController.js";

       const router = express.Router();

router.post("/", createInternship);

router.get("/", getAllInternships);

router.get("/:id", getInternshipById);

export default router;