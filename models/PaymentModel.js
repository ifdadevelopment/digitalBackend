import mongoose from "mongoose";
const PaymentTempSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    cartItems: [
      {
        courseId: String,
        title: String,
        price: Number,
        salePrice: Number,
        image: String,
      },
    ],
    razorpay_order_id: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);
const PaymentSchema = new mongoose.Schema(
  {
    user: {
      name: String,
      email: String,
    },
    cartItems: [
      {
        courseId: String,
        title: String,
        price: Number,
        salePrice: Number,
        image: String, 
      },
    ],
    razorpay_order_id: String,
    razorpay_payment_id: String,
    amountPaid: Number,
    paymentMethod: String,
  },
  { timestamps: true }
);

export const PaymentTemp = mongoose.model("PaymentTemp", PaymentTempSchema);
export default mongoose.model("Payment", PaymentSchema);
