import express from "express";

import {
    createResumeOrder,
    verifyResumePayment,
    createSubscriptionOrder,
    verifySubscriptionPayment
} from "../controllers/paymentController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const route = express.Router();

route.post("/create-order", authMiddleware, createResumeOrder);
route.post("/verify", authMiddleware, verifyResumePayment);
route.post("/subscription/create-order", authMiddleware, createSubscriptionOrder);
route.post("/subscription/verify", authMiddleware, verifySubscriptionPayment);


export default route;