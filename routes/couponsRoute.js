import express from "express";
import {
  generateCoupon,
  validateCoupon,
  listCoupons,
} from "../controllers/couponController.js";

const couponRouter = express.Router();

couponRouter.post("/generate", generateCoupon);
couponRouter.post("/validate", validateCoupon);
couponRouter.get("/list", listCoupons);

export default couponRouter;