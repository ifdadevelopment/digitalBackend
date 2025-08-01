import express from "express";
import {
  generateCoupon,
  validateCoupon,
  listCoupons,
  deleteCoupon,
} from "../controllers/couponController.js";

const couponRouter = express.Router();

couponRouter.post("/generate", generateCoupon);
couponRouter.post("/validate", validateCoupon);
couponRouter.get("/list", listCoupons);
couponRouter.delete("/delete/:code", deleteCoupon);

export default couponRouter;