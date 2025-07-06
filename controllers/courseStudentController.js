import { v4 as uuidv4 } from "uuid";
import Course from "../models/CourseModel.js";
import CourseStudent from "../models/CourseStudentModel.js";
import Payment from "../models/PaymentModel.js";
import userModel from "../models/UserModel.js";

// ✅ Create course enrollment (after payment)
export const createCourseStudent = async (req, res, next) => {
  try {
    const { _id: userId } = req.user;
    const {
      courseId, badge, level, tags, totalHours,
      watchedHours, modules, finalTest,
    } = req.body;

    const course = await Course.findOne({ courseId, type: "Student" });
    if (!course) {
      return res.status(404).json({ message: "Course not found or invalid type." });
    }

    const safeTotal = Number(totalHours) || 0;
    const safeWatched = Number(watchedHours) || 0;
    const progressPercentage = safeTotal > 0 ? (safeWatched / safeTotal) * 100 : 0;

    const enrolledCourse = {
      courseId: course.courseId,
      title: course.title,
      image: course.image,
      previewVideo: course.previewVideo,
      badge: badge || "",
      level: level || "Beginner",
      tags: tags || [],
      totalHours: safeTotal,
      watchedHours: safeWatched,
      modules: (modules || []).map((mod) => ({
        moduleTitle: mod.moduleTitle,
        description: mod.description,
        completed: mod.completed || false,
        topics: (mod.topics || []).map((topic) => ({
          topicId: uuidv4(),
          topicTitle: topic.topicTitle,
          completed: topic.completed || false,
          contents: (topic.contents || []).map((c) => ({
            type: c.type,
            name: c.name,
            duration: c.duration,
            url: c.url,
            completed: c.completed || false,
            score: c.score || 0,
            questions: (c.questions || []).map((q) => ({
              question: q.question,
              options: q.options,
              answer: q.answer,
              selectedAnswer: q.selectedAnswer || "",
              isCorrect: q.isCorrect || false,
            })),
          })),
        })),
      })),
      finalTest: finalTest
        ? {
            name: finalTest.name || "",
            type: "test",
            completed: finalTest.completed || false,
            score: finalTest.score || 0,
            questions: (finalTest.questions || []).map((q) => ({
              question: q.question,
              options: q.options,
              answer: q.answer,
              selectedAnswer: q.selectedAnswer || "",
              isCorrect: q.isCorrect || false,
            })),
          }
        : {
            name: "",
            type: "test",
            completed: false,
            score: 0,
            questions: [],
          },
      progress: false,
      progressPercentage,
      isCompleted: safeWatched === safeTotal && safeTotal > 0,
      startedAt: new Date(),
    };

    let student = await CourseStudent.findOne({ userId });

    if (!student) {
      student = new CourseStudent({
        userId,
        enrolledCourses: [enrolledCourse],
      });
    } else {
      const exists = student.enrolledCourses.some((c) => c.courseId === courseId);
      if (exists) {
        return res.status(400).json({ message: "Already enrolled in this course." });
      }
      student.enrolledCourses.push(enrolledCourse);
    }

    const saved = await student.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("createCourseStudent error:", err);
    next(err);
  }
};

// ✅ Get all students (Admin)
export const getAllCourseStudents = async (req, res, next) => {
  try {
    const students = await CourseStudent.find();
    res.status(200).json(students);
  } catch (err) {
    next(err);
  }
};

// ✅ Get all or specific enrolled course (must be purchased)

export const getPurchasedEnrolledCourseDetailsByUser = async (req, res) => {
  try {
   const userId = req.user._id;

    // ✅ 1. Get user
    const user = await userModel.findById(userId).select("email");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // ✅ 2. Get all successful payments
    const payments = await Payment.find({
      "user.email": user.email,
      razorpay_payment_id: { $exists: true, $ne: null },
    });

    if (!payments.length) {
      return res.status(200).json({
        success: true,
        enrolledCourses: [],
        message: "No successful payments found for this user.",
      });
    }

    // ✅ 3. Extract purchased course UUIDs
    const purchasedCourseIds = [
      ...new Set(
        payments.flatMap((p) =>
          p.cartItems.map((item) => item.courseId?.toString()).filter(Boolean)
        )
      ),
    ];

    if (!purchasedCourseIds.length) {
      return res.status(200).json({
        success: true,
        enrolledCourses: [],
        message: "No valid course IDs found in payments.",
      });
    }

    // ✅ 4. Find enrolled course data by matching courseId in CourseStudent
    const courseStudent = await CourseStudent.findOne({
      "enrolledCourses.courseId": { $in: purchasedCourseIds },
    });

    if (!courseStudent || !courseStudent.enrolledCourses?.length) {
      return res.status(200).json({
        success: true,
        enrolledCourses: [],
        message: "No enrolled courses found for purchased courses.",
      });
    }

    // ✅ 5. Filter only enrolled courses that match purchased courseIds
    const matchedEnrolledCourses = courseStudent.enrolledCourses.filter((course) =>
      purchasedCourseIds.includes(course.courseId)
    );

    return res.status(200).json({
      success: true,
      enrolledCourses: matchedEnrolledCourses,
      message: `Found ${matchedEnrolledCourses.length} purchased & enrolled course(s).`,
    });
  } catch (err) {
    console.error("❌ Error in getPurchasedEnrolledCourseDetailsByUser:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch enrolled course details",
      error: err.message,
    });
  }
};


// ✅ Update watched progress
export const updateProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { courseId, watchedHours } = req.body;

    const student = await CourseStudent.findById(id);
    if (!student) return res.status(404).json({ message: "Student not found." });

    const course = student.enrolledCourses.find((c) => c.courseId === courseId);
    if (!course) return res.status(404).json({ message: "Course not found in enrollment." });

    course.watchedHours = watchedHours;
    course.progressPercent = Math.min(100, Math.round((watchedHours / course.totalHours) * 100));

    await student.save();
    res.status(200).json(course);
  } catch (err) {
    next(err);
  }
};

// ✅ Admin: update full enrolledCourses array
export const updateCourseStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { enrolledCourses } = req.body;

    const existing = await CourseStudent.findById(id);
    if (!existing) return res.status(404).json({ message: "CourseStudent not found." });

    existing.enrolledCourses = enrolledCourses;
    const updated = await existing.save();
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

// ✅ Delete CourseStudent (admin)
export const deleteCourseStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await CourseStudent.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Not found." });

    res.status(200).json({ message: "Deleted successfully." });
  } catch (err) {
    next(err);
  }
};
