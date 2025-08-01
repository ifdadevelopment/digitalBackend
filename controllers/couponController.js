import Coupon from "../models/Coupon.js";

const generateCouponCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "BDS";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const generateCoupon = async (req, res) => {
  const { discount } = req.body;
  if (!discount || discount < 1 || discount > 100) {
    return res.status(400).json({ message: "Discount must be between 1% and 100%" });
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const code = generateCouponCode();

  const coupon = new Coupon({
    code,
    discount,
    expiresAt,
  });

  try {
    await coupon.save();
    res.json(coupon);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const validateCoupon = async (req, res) => {
  const { code, cartLength } = req.body;
  if (!code || !/^BDS[0-9A-Z]{5}$/.test(code)) {
    return res.status(400).json({ isValid: false, message: "❌ Invalid coupon format" });
  }

  const coupon = await Coupon.findOne({ code });

  if (!coupon) return res.status(404).json({ isValid: false, message: "❌ Coupon not found" });
  if (coupon.expiresAt < new Date()) {
    return res.status(400).json({ isValid: false, message: "❌ Coupon expired" });
  }
  if (cartLength < 1) {
    return res.status(400).json({ isValid: false, message: "🛒 Add at least 1 item to apply coupon" });
  }

  res.json({
    isValid: true,
    discountPercentage: coupon.discount,
    message: `✅ Coupon Applied: ${coupon.discount}% OFF`,
  });
};

export const listCoupons = async (req, res) => {
  const now = new Date();
  const coupons = await Coupon.find({ expiresAt: { $gt: now } }).sort({ expiresAt: -1 });
  res.json(
    coupons.map((c, i) => ({
      id: i + 1,
      code: c.code,
      discount: `${c.discount}%`,
      expiresAt: c.expiresAt.toLocaleString(),
    }))
  );
};

// ✅ NEW: Delete a coupon by code
export const deleteCoupon = async (req, res) => {
  const { code } = req.params;

  if (!code || !/^BDS[0-9A-Z]{5}$/.test(code)) {
    return res.status(400).json({ message: "❌ Invalid coupon code format" });
  }

  try {
    const deleted = await Coupon.findOneAndDelete({ code });

    if (!deleted) {
      return res.status(404).json({ message: "❌ Coupon not found" });
    }

    res.json({ message: `🗑️ Coupon "${code}" deleted successfully` });
  } catch (err) {
    res.status(500).json({ message: "❌ Error deleting coupon", error: err.message });
  }
};