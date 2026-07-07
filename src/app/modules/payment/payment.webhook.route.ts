import express, { Router } from "express";
import { paymentController } from "./payment.controller";

const router = Router();

const rawBody = express.raw({ type: "application/json" });

router.post("/payments/webhook", rawBody, paymentController.handleWebhook);

export const paymentWebhookRoutes = router;