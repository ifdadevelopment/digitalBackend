import express from "express";
import {
  createOrder,
  verifyPayment,
  getPaymentsByUser,
} from "../controllers/paymentController.js";

const paymentRouter = express.Router();

paymentRouter.post("/create-order", createOrder);
paymentRouter.post("/verify", verifyPayment);
paymentRouter.get("/user/:userId", getPaymentsByUser);

export default paymentRouter;
