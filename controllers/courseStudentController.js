import Course from "../models/CourseModel.js";
import CourseStudent from "../models/CourseStudentModel.js";
import { v4 as uuidv4 } from 'uuid';

export const createCourseStudent = async (req, res, next) => {
  try {
    const {
      courseId,
      badge,
      level,
      tags,
      totalHours,
      watchedHours,
      modules,
      finalTest
    } = req.body;

    const course = await Course.findOne({ courseId, type: "Student" });

    if (!course) {
      return res.status(404).json({
        message: "Course not found or not a Student-type course"
      });
    }

    const enrolledCourse = {
      courseId: course.courseId,
      title: course.title,
      image: course.image,
      previewVideo: course.previewVideo,
      badge: badge || "",
      level: level || "Beginner",
      tags: tags || [],
      totalHours: totalHours || 0,
      watchedHours: watchedHours || 0,
      modules: Array.isArray(modules)
        ? modules.map((mod) => ({
            moduleTitle: mod.moduleTitle,
            description: mod.description,
            completed: mod.completed || false,
            topics: Array.isArray(mod.topics)
              ? mod.topics.map((topic) => ({
                  topicId: uuidv4(),
                  topicTitle: topic.topicTitle,
                  completed: topic.completed || false,
                  contents: Array.isArray(topic.contents)
                    ? topic.contents.map((content) => ({
                        type: content.type,
                        name: content.name,
                        duration: content.duration,
                        url: content.url,
                        completed: content.completed || false,
                        score: content.score || 0,
                        questions: Array.isArray(content.questions)
                          ? content.questions.map((q) => ({
                              question: q.question,
                              options: q.options,
                              answer: q.answer,
                              selectedAnswer: q.selectedAnswer || "",
                              isCorrect: q.isCorrect || false
                            }))
                          : []
                      }))
                    : []
                }))
              : []
          }))
        : [],
      finalTest: finalTest
        ? {
            name: finalTest.name || "",
            type: "test",
            completed: finalTest.completed || false,
            score: finalTest.score || 0,
            questions: Array.isArray(finalTest.questions)
              ? finalTest.questions.map((q) => ({
                  question: q.question,
                  options: q.options,
                  answer: q.answer,
                  selectedAnswer: q.selectedAnswer || "",
                  isCorrect: q.isCorrect || false
                }))
              : []
          }
        : {
            name: "",
            type: "test",
            completed: false,
            score: 0,
            questions: []
          },
      progress: false,
      progressPercent: 0,
      isCompleted: false,
      startedAt: new Date()
    };

    let courseStudent = await CourseStudent.findOne();

    if (!courseStudent) {
      courseStudent = new CourseStudent({
        enrolledCourses: [enrolledCourse]
      });
    } else {
      const alreadyEnrolled = courseStudent.enrolledCourses.find(
        (c) => c.courseId === course.courseId
      );

      if (alreadyEnrolled) {
        return res.status(400).json({
          message: "Student is already enrolled in this course"
        });
      }

      courseStudent.enrolledCourses.push(enrolledCourse);
    }

    const saved = await courseStudent.save();
    return res.status(201).json(saved);
  } catch (error) {
    console.error("Create course student error:", error);
    next(error); 
  }
};


export const getAllCourseStudents = async (req, res, next) => {
  try {
    const students = await CourseStudent.find();
    res.status(200).json(students);
  } catch (error) {
    next(error);
  }
};

export const updateCourseStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { enrolledCourses } = req.body;

    const existing = await CourseStudent.findById(id);
    if (!existing) {
      return res.status(404).json({ message: "CourseStudent not found" });
    }

    const updatedEnrolledCourses = enrolledCourses.map((incomingCourse, index) => {
      const original = existing.enrolledCourses[index];
      return {
        ...original.toObject(),
        ...incomingCourse,
        courseId: original.courseId,
        title: original.title,
        image: original.image,
        previewVideo: original.previewVideo
      };
    });

    existing.enrolledCourses = updatedEnrolledCourses;
    const saved = await existing.save();
    res.status(200).json(saved);
  } catch (error) {
    next(error);
  }
};

export const deleteCourseStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await CourseStudent.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "CourseStudent not found" });
    }

    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const updateProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { courseId, watchedHours } = req.body;

    const courseStudent = await CourseStudent.findById(id);
    if (!courseStudent) {
      return res.status(404).json({ message: "CourseStudent not found" });
    }

    const course = courseStudent.enrolledCourses.find(c => c.courseId === courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found in enrolledCourses" });
    }

    course.watchedHours = watchedHours;
    course.progressPercent = Math.min(100, Math.round((watchedHours / course.totalHours) * 100));

    await courseStudent.save();
    res.status(200).json(course);
  } catch (error) {
    next(error);
  }
};

export const getCourseStudentCourseDetails = async (req, res, next) => {
  try {
    const { id, courseId } = req.params;

    const courseStudent = await CourseStudent.findById(id);
    if (!courseStudent) {
      return res.status(404).json({ message: "CourseStudent not found" });
    }

    const enrolledCourse = courseStudent.enrolledCourses.find(c => c.courseId === courseId);
    if (!enrolledCourse) {
      return res.status(404).json({ message: "Enrolled course not found" });
    }

    res.status(200).json(enrolledCourse);
  } catch (error) {
    next(error);
  }
};
