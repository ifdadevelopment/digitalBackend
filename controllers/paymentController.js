import crypto from "crypto";
import razorpay from "../utils/razorpay.js";
import Payment, { PaymentTemp } from "../models/PaymentModel.js";
import User from "../models/UserModel.js";
import axios from "axios";

// Create Razorpay Order and save temp
export const createOrder = async (req, res) => {
  try {
    const { amount, userId, cartItems } = req.body;

    if (!amount || !userId || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "Required fields missing" });
    }

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    await PaymentTemp.create({
      userId,
      cartItems,
      razorpay_order_id: order.id,
      amount,
    });

    return res.status(200).json({
      success: true,
      orderId: order.id,
      currency: order.currency,
      amount: order.amount,
    });
  } catch (err) {
    console.error("❌ Create order error:", err);
    res.status(500).json({ success: false, message: "Create order failed", error: err.message });
  }
};

// Verify Razorpay Payment
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = hmac.digest("hex");

    if (digest !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid Razorpay signature" });
    }

    const temp = await PaymentTemp.findOne({ razorpay_order_id });
    if (!temp) {
      return res.status(404).json({ success: false, message: "Temp order not found" });
    }

    const user = await User.findById(temp.userId).select("name email");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { data: paymentDetails } = await axios.get(
      `https://api.razorpay.com/v1/payments/${razorpay_payment_id}`,
      {
        auth: {
          username: process.env.RAZORPAY_KEY_ID,
          password: process.env.RAZORPAY_SECRET,
        },
      }
    );

    const payment = await Payment.create({
      user: { name: user.name, email: user.email },
      cartItems: temp.cartItems,
      razorpay_order_id,
      razorpay_payment_id,
      amountPaid: temp.amount,
      paymentMethod: paymentDetails.method || "unknown",
    });

    await PaymentTemp.deleteOne({ _id: temp._id });

    return res.status(200).json({
      success: true,
      message: "Payment verified",
      paymentDetails: {
        username: user.name,
        email: user.email,
        amountPaid: temp.amount,
        paymentMethod: payment.paymentMethod,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        date: payment.createdAt,
        courses: temp.cartItems.map((c) => ({
          id: c.courseId,
          title: c.title,
          price: c.salePrice || c.price,
          image: c.image || "",
        })),
      },
    });
  } catch (err) {
    console.error("❌ Verify error:", err);
    res.status(500).json({ success: false, message: "Verification failed", error: err.message });
  }
};

// Get All Payments for User
export const getPaymentsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select("email");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const payments = await Payment.find({ "user.email": user.email }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      payments: payments.map((p) => ({
        id: p._id,
        orderId: p.razorpay_order_id,
        paymentId: p.razorpay_payment_id,
        paymentMethod: p.paymentMethod,
        date: p.createdAt,
        amountPaid: p.amountPaid,
        courses: p.cartItems.map((c) => ({
          id: c.courseId,
          title: c.title,
          price: c.salePrice || c.price,
          image: c.image || "", 
        })),
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Fetch failed", error: err.message });
  }
};

// get all payment details for admin 


export const getAllSuccessfulPayments = async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });

    const enrichedPayments = payments.map((payment, index) => {
      return payment.cartItems.map((item) => ({
        slNo: index + 1,
        userName: payment.user?.name || "N/A",
        courseTitle: item.title || "N/A",
        courseImage: item.image || "",
        orderId: payment.razorpay_order_id || "",
        amount: payment.amountPaid || 0,
        method: payment.paymentMethod || "Unknown",
        createdAt: payment.createdAt,
      }));
    });

    // Flatten array (since cartItems is an array per payment)
    const flatPayments = enrichedPayments.flat();

    res.status(200).json({
      success: true,
      count: flatPayments.length,
      payments: flatPayments,
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch successful payments",
      error: error.message,
    });
  }
};
