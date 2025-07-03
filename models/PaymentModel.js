import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  courseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
  razorpay_order_id: { type: String, required: true },
  razorpay_payment_id: { type: String, required: true },
  amountPaid: { type: Number, required: true },
  paymentMethod: { 
    type: String, 
    enum: ["UPI", "Credit Card", "Netbanking", "Wallet", "Other"], 
    required: true 
  },
  createdAt: { type: Date, default: Date.now },
});

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
