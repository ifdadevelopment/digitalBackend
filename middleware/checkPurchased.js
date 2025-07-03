import Payment from "../models/PaymentModel.js";

export const verifyPurchasedCourse = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const courseId = req.params.courseId || req.body.courseId || req.query.courseId;

    if (!courseId) {
      return res.status(400).json({ success: false, message: "Missing courseId" });
    }
    const payment = await Payment.findOne({
      userId,
      courseIds: courseId,
    });

    if (!payment) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You have not purchased this course.",
      });
    }
    next();
  } catch (error) {
    console.error("verifyPurchasedCourse error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
