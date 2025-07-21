import { v4 as uuidv4 } from "uuid";
import Course from "../models/CourseModel.js";
import CourseStudent from "../models/CourseStudentModel.js";
import Payment from "../models/PaymentModel.js";
import userModel from "../models/UserModel.js";

// ✅ Create course enrollment 
export const createCourseStudent = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const {
      courseId,
      badge,
      level,
      tags,
      watchedHours,
      totalHours,
      modules: rawModules,
      finalTest: rawFinalTest
    } = req.body;

    const course = await Course.findOne({ courseId, type: "Student" });
    if (!course) {
      return res.status(404).json({ message: "Course not found or not a Student-type course" });
    }

    const s3Uploads = req.s3Uploads || [];

    const parsedTags = typeof tags === "string" ? JSON.parse(tags) : [];
    const parsedModules = typeof rawModules === "string" ? JSON.parse(rawModules) : [];
    const parsedFinalTest = typeof rawFinalTest === "string" ? JSON.parse(rawFinalTest) : null;

    let hours = 0;
    let assessments = 0;
    let assignments = 0;

    const modules = parsedModules.map((mod, mIndex) => ({
      moduleTitle: mod.moduleTitle,
      description: mod.description,
      completed: mod.completed || false,
      topics: (mod.topics || []).map((topic, tIndex) => ({
        topicId: uuidv4(),
        topicTitle: topic.topicTitle,
        completed: topic.completed || false,
        contents: (topic.contents || []).map((content, cIndex) => {
          const fieldPrefix = `content-${content.type}-${mIndex}-${tIndex}-${cIndex}`;
          const matchedFile = s3Uploads.find(file => file.field === fieldPrefix);

          const duration = Number(content.duration) || 0;
          hours += duration;

          const contentQuestions = (content.questions || []).map(q => ({
            question: q.question,
            options: q.options,
            answer: q.answer,
            selectedAnswer: q.selectedAnswer || "",
            multiSelect: q.multiSelect || false,
            isCorrect: q.isCorrect || false
          }));

          if (contentQuestions.length) assessments++;
          assignments += contentQuestions.length;

          return {
            type: content.type,
            name: content.name,
            duration,
            pages: content.pages || "",
            url: matchedFile?.url || "", 
            completed: content.completed || false,
            score: content.score || 0,
            questions: contentQuestions
          };
        })
      }))
    }));

    const finalTest = parsedFinalTest
      ? {
          name: parsedFinalTest.name || "Final Assessment",
          type: "test",
          completed: parsedFinalTest.completed || false,
          score: parsedFinalTest.score || 0,
          questions: (parsedFinalTest.questions || []).map(q => ({
            question: q.question,
            options: q.options,
            answer: q.answer,
            selectedAnswer: q.selectedAnswer || "",
            multiSelect: q.multiSelect || false,
            isCorrect: q.isCorrect || false
          }))
        }
      : null;

    const enrolledCourse = {
      courseId,
      title: course.title,
      image: course.image,
      previewVideo: course.previewVideo,
      badge: badge || "",
      level: level || "Beginner",
      tags: parsedTags,
      totalHours: Number(totalHours) || hours,
      watchedHours: Number(watchedHours) || 0,
      assessments,
      assignments,
      questions: finalTest?.questions?.length || 0,
      modules,
      finalTest,
      progress: false,
      progressPercent: hours > 0 ? Math.round((watchedHours / hours) * 100) : 0,
      isCompleted: Number(watchedHours) === hours && hours > 0,
      startedAt: new Date()
    };
    let courseStudent = await CourseStudent.findOne({ userId });

    if (!courseStudent) {
      courseStudent = new CourseStudent({
        userId,
        enrolledCourses: [enrolledCourse]
      });
    } else {
      const already = courseStudent.enrolledCourses.find(c => c.courseId === courseId);
      if (already) {
        return res.status(400).json({ message: "Already enrolled in this course" });
      }
      courseStudent.enrolledCourses.push(enrolledCourse);
    }

    courseStudent.updateGlobalProgress();
    const saved = await courseStudent.save();

    return res.status(201).json({
      message: "Enrollment created successfully",
      data: saved
    });
  } catch (error) {
    console.error("❌ createCourseStudent error:", error);
    next(error);
  }
};
// ✅ Get all students (Admin)
export const getAllEnrolledCourses = async (req, res, next) => {
  try {
    const { courseId } = req.query;

    const students = await CourseStudent.find();

    let totalEnrolledCourses = 0;
    let totalEnrolledUsers = 0;
    const enrolledCourses = [];
    const uniqueCourseIds = new Set();

    for (const student of students) {
      const courses = Array.isArray(student.enrolledCourses) ? student.enrolledCourses : [];

      const filteredCourses = courseId
        ? courses.filter((c) => c.courseId?.toString() === courseId)
        : courses;

      if (filteredCourses.length > 0) {
        totalEnrolledUsers += 1;
      }

      totalEnrolledCourses += filteredCourses.length;

      for (const course of filteredCourses) {
        const courseObj = typeof course.toObject === "function" ? course.toObject() : course;

        if (courseObj.courseId) {
          uniqueCourseIds.add(courseObj.courseId.toString());
        }

        enrolledCourses.push({
          userId: student.userId,
          ...courseObj,
        });
      }
    }

    // ✅ Fetch all courses of type "Student" with only courseId and title
    const studentCourses = await Course.find({ type: "Student" }).select("courseId title");

    return res.status(200).json({
      success: true,
      summary: {
        totalEnrolledUsers,
        totalEnrolledCourses,
        totalUniqueCourses: uniqueCourseIds.size,
      },
      enrolledCourses,
      studentCourses, 
    });
  } catch (err) {
    console.error("Failed to fetch enrolled courses:", err);
    next({
      statusCode: 500,
      message: "Failed to fetch enrolled courses",
      error: err.message,
    });
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
// ✅ GET Resume Data for Specific Course
export const getCourseResume = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const courseStudent = await CourseStudent.findOne({ userId });

    if (!courseStudent) {
      return res.status(200).json({
        resume: {
          lastWatched: null,
          watchedHours: 0,
          progressPercent: 0,
          progress: false,
          isCompleted: false
        }
      });
    }

    const course = courseStudent.enrolledCourses.find(c => c.courseId === courseId);

    if (!course) {
      return res.status(200).json({
        resume: {
          lastWatched: null,
          watchedHours: 0,
          progressPercent: 0,
          progress: false,
          isCompleted: false
        }
      });
    }

    const resume = {
      lastWatched: course.lastWatched || null,
      watchedHours: course.watchedHours || 0,
      progressPercent: course.progressPercent || 0,
      progress: course.progress || false,
      isCompleted: course.isCompleted || false
    };

    res.status(200).json({ resume });

  } catch (err) {
    next(err); 
  }
};
// ✅ Update Resume Progress and Last Watched
export const updateCourseResume = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { courseId } = req.params;
    const { lastWatched = {}, watchedHours = 0 } = req.body;

    let courseStudent = await CourseStudent.findOne({ userId });

    if (!courseStudent) {
      courseStudent = new CourseStudent({
        userId,
        enrolledCourses: []
      });
    }

    let course = courseStudent.enrolledCourses.find(c => c.courseId === courseId);

    if (!course) {
      course = {
        courseId,
        watchedHours: 0,
        progressPercent: 0,
        progress: false,
        isCompleted: false,
        lastWatched: {}
      };
      courseStudent.enrolledCourses.push(course);
    }

    course.watchedHours = watchedHours;
    course.lastWatched = {
      moduleIndex: lastWatched.moduleIndex || 0,
      topicIndex: lastWatched.topicIndex || 0,
      contentIndex: lastWatched.contentIndex || 0
    };

    const courseDetails = await Course.findById(courseId);
    const totalHours = courseDetails?.totalHours || 1;

    course.progressPercent = Math.min(100, Math.round((watchedHours / totalHours) * 100));
    course.progress = course.progressPercent > 0;
    course.isCompleted = watchedHours >= totalHours;

    if (typeof courseStudent.updateGlobalProgress === "function") {
      courseStudent.updateGlobalProgress();
    }

    await courseStudent.save();

    res.status(200).json({
      success: true,
      message: "Resume updated",
      resume: course.lastWatched
    });

  } catch (err) {
    next(err); 
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
//Final Test added 
export const addFinalTestToCourse = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { courseId, finalTest: rawFinalTest } = req.body;
    if (!courseId || !rawFinalTest) {
      return res.status(400).json({ message: "Missing courseId or finalTest" });
    }

    const parsedFinalTest =
      typeof rawFinalTest === "string" ? JSON.parse(rawFinalTest) : rawFinalTest;

    const courseStudent = await CourseStudent.findOne({ userId });
    if (!courseStudent) {
      return res.status(404).json({ message: "Student record not found" });
    }

    const enrolledCourse = courseStudent.enrolledCourses.find(
      (c) => c.courseId === courseId
    );

    if (!enrolledCourse) {
      return res.status(404).json({ message: "Enrolled course not found" });
    }
    const testName = parsedFinalTest.name?.trim();
    if (!testName) {
      return res.status(400).json({ message: "Test name is required." });
    }
    enrolledCourse.finalTest = {
      name: testName,
      type: "test",
      completed: false,
      score: 0,
      questions: parsedFinalTest.questions.map((q) => ({
        question: q.question,
        options: q.options,
        answer: q.answer,
        selectedAnswer: "",
        multiSelect: q.multiSelect || false,
        isCorrect: false,
      })),
    };

    enrolledCourse.questions = enrolledCourse.finalTest.questions.length;
    if (!Array.isArray(enrolledCourse.testNames)) {
      enrolledCourse.testNames = [];
    }
    if (!enrolledCourse.testNames.includes(testName)) {
      enrolledCourse.testNames.push(testName);
    }

    courseStudent.updateGlobalProgress?.(); 
    await courseStudent.save();

    return res.status(200).json({
      message: "✅ Final test added successfully.",
      finalTest: enrolledCourse.finalTest,
      testNames: enrolledCourse.testNames,
    });
  } catch (error) {
    console.error("❌ Error adding final test:", error);
    next(error);
  }
};




