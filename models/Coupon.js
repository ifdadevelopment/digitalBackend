import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  discount: {
    type: Number,
    required: true,
    min: 1,
    max: 100,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

export default mongoose.model("Coupon", couponSchema);