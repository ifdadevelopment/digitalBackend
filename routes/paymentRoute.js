import express from "express";
import {
  createOrder,
  verifyPayment,
  getPaymentsByUser,
  getAllSuccessfulPayments,
} from "../controllers/paymentController.js";

const paymentRouter = express.Router();

paymentRouter.post("/create-order", createOrder);
paymentRouter.post("/verify", verifyPayment);
paymentRouter.get("/user/:userId", getPaymentsByUser);
paymentRouter.get("/successful", getAllSuccessfulPayments);

export default paymentRouter;
