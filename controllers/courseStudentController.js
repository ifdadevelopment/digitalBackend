import { v4 as uuidv4 } from "uuid";
import Course from "../models/CourseModel.js";
import CourseStudent from "../models/CourseStudentModel.js";
import Payment from "../models/PaymentModel.js";
import userModel from "../models/UserModel.js";
import { deleteS3File } from "../utils/deleteS3File.js";

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

let totalDuration = 0;
let assessments = 0;
let assignments = 0;

const modules = parsedModules.map((mod, mIndex) => ({
  moduleTitle: mod.moduleTitle,
  description: mod.description,
  completed: mod.completed || false,
  topics: (mod.topics || []).map((topic, tIndex) => {
    const topicContents = (topic.contents || []);
    
    assessments += topicContents.length; 

    const updatedContents = topicContents.map((content, cIndex) => {
      const fieldPrefix = `content-${content.type}-${mIndex}-${tIndex}-${cIndex}`;
      const matchedFile = s3Uploads.find(file => file.field === fieldPrefix);
      const duration = Number(content.duration) || 0;
      totalDuration += duration;
      if (Array.isArray(content.questions) && content.questions.length > 0) {
        assignments++;
      }

      return {
        type: content.type,
        name: matchedFile?.originalName || content.name || "",
        duration,
        pages: content.pages || "",
        url: matchedFile?.url || content.url || "",
        completed: content.completed || false,
        score: content.score || 0,
        questions: (content.questions || []).map(q => ({
          question: q.question,
          options: q.options,
          answer: q.answer,
          selectedAnswer: q.selectedAnswer || "",
          multiSelect: q.multiSelect || false,
          isCorrect: q.isCorrect || false
        }))
      };
    });

    return {
      topicId: uuidv4(),
      topicTitle: topic.topicTitle,
      completed: topic.completed || false,
      contents: updatedContents
    };
  })
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

function formatDuration(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const padded = (n) => String(n).padStart(2, '0');
  return `${padded(hrs)}:${padded(mins)}:${padded(secs)}`;
}
function formatTotalHours(minutes) {
  if (minutes < 1) return `0 min`;

  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs}h`;

  return `${hrs}h ${mins}m`;
}


    const enrolledCourse = {
      courseId,
      title: course.title,
      image: course.image,
      previewVideo: course.previewVideo,
      badge: badge || "",
      level: level || "Beginner",
      tags: parsedTags,
      totalHours: totalDuration,
      totalHoursDisplay: formatTotalHours(totalDuration),
      watchedHours: 0,
      assessments,
      assignments,
      questions: finalTest?.questions?.length || 0,
      modules,
      finalTest,
      progress: false,
      progressPercent: 0,
      isCompleted: false,
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

    courseStudent.updateGlobalProgress?.();
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
    const userId = req.user.id;

    const courseStudent = await CourseStudent.findOne({ userId });

    // If no courseStudent document exists, return default resume
    if (!courseStudent) {
      return res.status(200).json({
        success: true,
        message: 'No student data found, returning default resume',
        resume: getDefaultResume(),
      });
    }

    const course = courseStudent.enrolledCourses.find(
      (c) => c.courseId.toString() === courseId
    );

    // If course is not found in user's enrolled list
    if (!course) {
      return res.status(200).json({
        success: true,
        message: 'No progress found for this course, returning default resume',
        resume: getDefaultResume(),
      });
    }

    // Return actual resume if available
    return res.status(200).json({
      success: true,
      message: 'Resume fetched successfully',
      resume: {
        watchedHours: course.watchedHours || 0,
        completedContent: course.completedContent || [],
        lastWatched: course.lastWatched || {},
        progressPercent: course.progressPercent || 0,
        moduleProgress: course.moduleProgress || [],
        isCompleted: course.isCompleted || false,
      },
    });
  } catch (err) {
    console.error("❌ getCourseResume error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch course resume",
      error: err.message,
    });
  }
};

function getDefaultResume() {
  return {
    watchedHours: 0,
    completedContent: [],
    lastWatched: {},
    progressPercent: 0,
    moduleProgress: [],
    isCompleted: false,
  };
}
// ✅ Update Resume Progress and Last Watched
export const updateCourseResume = async (req, res, next) => {
  try {
    const userId = req.user.id;
   const { courseId } = req.body;

    const {
      lastWatched = {},
      watchedHours = 0,
      completedContent = []
    } = req.body;

    let courseStudent = await CourseStudent.findOne({ userId });

    if (!courseStudent) {
      courseStudent = new CourseStudent({ userId, enrolledCourses: [] });
    }

    let course = courseStudent.enrolledCourses.find(c => c.courseId.toString() === courseId);
    if (!course) {
      course = {
        courseId,
        watchedHours: 0,
        progressPercent: 0,
        completedContent: [],
        moduleProgress: [],
        progress: false,
        isCompleted: false,
        lastWatched: {}
      };
      courseStudent.enrolledCourses.push(course);
    }

    const updatedCompletedContent = Array.from(new Set([
      ...(course.completedContent || []),
      ...(completedContent || [])
    ]));
    course.completedContent = updatedCompletedContent;

   const courseDetails = await Course.findOne({ id: courseId }).select("modules");
    const modules = courseDetails?.modules || [];

    let totalContents = 0;
    let totalCompleted = 0;
    let totalDuration = 0;
    const moduleProgress = [];

    modules.forEach((mod, modIdx) => {
      let moduleContents = 0;
      let moduleCompleted = 0;

      mod.topics?.forEach((topic, topicIdx) => {
        topic.contents?.forEach((content, contentIdx) => {
          const contentId = `${modIdx}-${topicIdx}-${contentIdx}`;
          moduleContents++;
          totalContents++;

          if (["video", "audio"].includes(content.type)) {
            const dur = parseFloat(content.duration || 0);
            totalDuration += isNaN(dur) ? 0 : dur;
          }

          if (updatedCompletedContent.includes(contentId)) {
            moduleCompleted++;
          }
        });
      });

      const modulePercent = moduleContents > 0
        ? Math.round((moduleCompleted / moduleContents) * 100)
        : 0;

      moduleProgress.push({
        moduleIndex: modIdx,
        progressPercent: modulePercent
      });
    });

    totalCompleted = updatedCompletedContent.length;
    const overallProgressPercent = totalContents > 0
      ? Math.round((totalCompleted / totalContents) * 100)
      : 0;

    course.progressPercent = overallProgressPercent;
    course.progress = overallProgressPercent > 0;
    course.isCompleted = overallProgressPercent === 100;
    course.moduleProgress = moduleProgress;

    const prevWatched = course.watchedHours || 0;
    course.watchedHours = prevWatched + watchedHours;

    course.lastWatched = {
      moduleIndex: lastWatched.moduleIndex || 0,
      topicIndex: lastWatched.topicIndex || 0,
      contentIndex: lastWatched.contentIndex || 0
    };

    if (!course.totalHours) {
      course.totalHours = totalDuration;
    }

    if (typeof courseStudent.updateGlobalProgress === 'function') {
      courseStudent.updateGlobalProgress();
    }

    await courseStudent.save();

    return res.status(200).json({
      success: true,
      message: "Progress updated",
      resume: {
        watchedHours: course.watchedHours,
        completedContent: course.completedContent,
        lastWatched: course.lastWatched,
        progressPercent: course.progressPercent,
        moduleProgress: course.moduleProgress,
        isCompleted: course.isCompleted
      }
    });
  } catch (err) {
    console.error("❌ updateCourseResume error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update resume",
      error: err.message
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
    const userId = req.user?.id;
    const { courseId } = req.params;
    const s3Uploads = req.s3Uploads || [];

    const courseStudent = await CourseStudent.findOne({ userId });
    if (!courseStudent) {
      return res.status(404).json({ message: "CourseStudent not found" });
    }

    const courseIndex = courseStudent.enrolledCourses.findIndex(
      (c) => c.courseId === courseId
    );
    if (courseIndex === -1) {
      return res.status(404).json({ message: "Enrolled course not found" });
    }
    const existingCourse = courseStudent.enrolledCourses[courseIndex];
    const originalTitle = existingCourse.title;
    const originalImage = existingCourse.image;
    const originalPreviewVideo = existingCourse.previewVideo;

    const {
      badge,
      level,
      tags,
      modules: rawModules,
      finalTest: rawFinalTest,
    } = req.body;

    let parsedTags = [];
    let parsedModules = [];
    let parsedFinalTest = null;

    try {
      parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags || [];
      parsedModules =
        typeof rawModules === "string" ? JSON.parse(rawModules) : rawModules || [];
      parsedFinalTest =
        typeof rawFinalTest === "string" ? JSON.parse(rawFinalTest) : rawFinalTest || null;
    } catch (error) {
      return res.status(400).json({ message: "Invalid JSON in form data." });
    }

    let totalDuration = 0;
    let assessments = 0;
    let assignments = 0;
    const totalQuestions = parsedFinalTest?.questions?.length || 0;

    const modules = await Promise.all(
      parsedModules.map(async (mod, mIndex) => ({
        moduleTitle: mod.moduleTitle,
        description: mod.description,
        completed: mod.completed || false,
        topics: await Promise.all(
          (mod.topics || []).map(async (topic, tIndex) => {
            const updatedContents = await Promise.all(
              (topic.contents || []).map(async (content, cIndex) => {
                const fieldName = `content-${content.type}-${mIndex}-${tIndex}-${cIndex}`;
                const matchedFile = s3Uploads.find((f) => f.field === fieldName);

                const oldUrl = content.url || "";
                const duration = Number(content.duration) || 0;
                totalDuration += duration;
                assessments++;

                let url = oldUrl;
                let name = content.name || "";

                if (matchedFile) {
                  if (oldUrl) {
                    try {
                      await deleteS3File(oldUrl);
                      console.log("🗑️ Deleted old file:", oldUrl);
                    } catch (err) {
                      console.warn("⚠️ Failed to delete old S3 file:", err.message);
                    }
                  }

                  url = matchedFile.url;
                  name = matchedFile.originalName;
                }

                const questions = (content.questions || []).map((q) => {
                  return {
                    question: q.question,
                    options: q.options,
                    answer: q.answer,
                    selectedAnswer: q.selectedAnswer || "",
                    multiSelect: q.multiSelect || false,
                    isCorrect: q.isCorrect || false,
                  };
                });

                if (questions.length > 0) assignments++;

                return {
                  type: content.type,
                  name,
                  url,
                  duration,
                  pages: content.pages || "",
                  completed: content.completed || false,
                  score: content.score || 0,
                  questions,
                };
              })
            );

            return {
              topicId: topic.topicId || uuidv4(),
              topicTitle: topic.topicTitle,
              completed: topic.completed || false,
              contents: updatedContents,
            };
          })
        ),
      }))
    );

    const finalTest = parsedFinalTest
      ? {
          name: parsedFinalTest.name || "Final Assessment",
          type: "test",
          completed: parsedFinalTest.completed || false,
          score: parsedFinalTest.score || 0,
          questions: (parsedFinalTest.questions || []).map((q) => {
            return {
              question: q.question,
              options: q.options,
              answer: q.answer,
              selectedAnswer: q.selectedAnswer || "",
              multiSelect: q.multiSelect || false,
              isCorrect: q.isCorrect || false,
            };
          }),
        }
      : null;
function formatDuration(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const padded = (n) => String(n).padStart(2, '0');
  return `${padded(hrs)}:${padded(mins)}:${padded(secs)}`;
}
function formatTotalHours(minutes) {
  if (minutes < 1) return `0 min`;

  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs}h`;

  return `${hrs}h ${mins}m`;
}


    const updatedCourse = {
      ...existingCourse, 
      badge: badge || "",
      level: level || "Beginner",
      tags: parsedTags,
      totalHours: totalDuration,
      totalHoursDisplay: formatTotalHours(totalDuration),
      assessments,
      assignments,
      questions: totalQuestions,
      modules,
      finalTest,
      updatedAt: new Date(),
      courseId,
      title: originalTitle,
      image: originalImage,
      previewVideo: originalPreviewVideo,
    };

    courseStudent.enrolledCourses[courseIndex] = updatedCourse;
    courseStudent.updateGlobalProgress?.();

    const saved = await courseStudent.save();

    res.status(200).json({
      message: "✅ Course updated successfully",
      data: saved,
    });
  } catch (err) {
    console.error("❌ updateCourseStudent error:", err);
    next(err);
  }
};

// ✅ Delete CourseStudent (admin)
export const deleteCourseStudent = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { courseId } = req.params;

    const courseStudent = await CourseStudent.findOne({ userId });
    if (!courseStudent) {
      return res.status(404).json({ message: "CourseStudent not found" });
    }

    const enrolledIndex = courseStudent.enrolledCourses.findIndex(
      (c) => c.courseId === courseId
    );

    if (enrolledIndex === -1) {
      return res.status(404).json({ message: "Course not enrolled" });
    }

    const enrolledCourse = courseStudent.enrolledCourses[enrolledIndex];

    // 🧹 Delete all S3 files tied to this course
    for (const mod of enrolledCourse.modules || []) {
      for (const topic of mod.topics || []) {
        for (const content of topic.contents || []) {
          if (content.url) {
            await deleteS3File(content.url);
          }
        }
      }
    }

    // 🧪 Final test cleanup if applicable
    if (enrolledCourse.finalTest) {
      for (const q of enrolledCourse.finalTest.questions || []) {
        if (q?.attachmentUrl) {
          await deleteS3File(q.attachmentUrl);
        }
      }
    }

    // ❌ Remove course from enrolledCourses
    courseStudent.enrolledCourses.splice(enrolledIndex, 1);
    courseStudent.updateGlobalProgress?.();

    await courseStudent.save();

    res.status(200).json({ message: "✅ Course deleted successfully" });
  } catch (err) {
    console.error("❌ Failed to delete courseStudent:", err);
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
    questions: (parsedFinalTest.questions || [])
  .filter(q => q.question && typeof q.question === "string" && q.question.trim())
  .map(q => ({
    question: q.question.trim(),
    options: q.options,
    answer: q.answer,
    selectedAnswer: q.selectedAnswer || "",
    multiSelect: q.multiSelect || false,
    isCorrect: q.isCorrect || false
  }))

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

