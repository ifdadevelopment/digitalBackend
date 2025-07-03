import crypto from "crypto";
import userModel from "../models/UserModel.js";
import razorpay from "../utils/razorpay.js";
import Payment from "../models/PaymentModel.js";
import Course from "../models/CourseModel.js";

export const createOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, message: "Amount required" });
    }

    const options = {
      amount: amount * 100, 
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      success: true,
      orderId: order.id,
      currency: order.currency,
      amount: order.amount,
    });
  } catch (err) {
    console.error("Create order failed:", err);
    res.status(500).json({ success: false, message: "Failed to create order", error: err.message });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amountPaid,
      courseIds,
      userId,
      paymentMethod, 
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature ||
        !amountPaid || !courseIds || !userId || !paymentMethod) {
      return res.status(400).json({ success: false, message: "Missing payment details" });
    }

    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }
    const payment = await Payment.create({
      userId,
      courseIds,
      razorpay_order_id,
      razorpay_payment_id,
      amountPaid,
      paymentMethod,
    });
    const user = await userModel.findById(userId).select("name email");
    const courses = await Course.find({ _id: { $in: courseIds } }).select("title");

    return res.status(200).json({
      success: true,
      message: "Payment verified and saved",
      paymentDetails: {
        userId: user._id,
        username: user.name,
        email: user.email,
        courses: courses.map((c) => ({ id: c._id, title: c.title })),
        amountPaid,
        paymentMethod,  
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        date: payment.createdAt,
      },
    });
  } catch (error) {
    console.error("Payment verification failed:", error);
    res.status(500).json({ success: false, message: "Verification failed", error: error.message });
  }
};

export const getPaymentsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const payments = await Payment.find({ userId })
      .populate("courseIds", "title")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      payments: payments.map((p) => ({
        id: p._id,
        amountPaid: p.amountPaid,
        paymentId: p.razorpay_payment_id,
        orderId: p.razorpay_order_id,
        paymentMethod: p.paymentMethod,  
        date: p.createdAt,
        courses: p.courseIds.map((c) => ({ id: c._id, title: c.title })),
      })),
    });
  } catch (err) {
    console.error("Fetch user payments failed:", err);
    res.status(500).json({ success: false, message: "Failed to get payments", error: err.message });
  }
};
