import mongoose from "mongoose";
import Course from "../models/CourseModel.js";
import CourseStudentModel from "../models/CourseStudentModel.js";


export const createCourseStudent = async (req, res, next) => {
  try {
    const { courseId, badge, level, tags, totalHours, watchedHours, modules, finalTest } = req.body;
    const course = await Course.findOne({ id: courseId, type: "Student" });

    if (!course) {
      return res.status(404).json({ message: "Course not found or not a Student type course" });
    }
    const enrolledCourse = {
      courseId: course._id,
      title: course.title,
      image: course.image,
      badge,
      level,
      tags,
      totalHours,
      watchedHours,
      modules,
      finalTest,
      progressPercent: 0
    };

    let courseStudent = await CourseStudent.findOne();

    if (!courseStudent) {
      courseStudent = new CourseStudent({
        enrolledCourses: [enrolledCourse]
      });
    } else {
      courseStudent.enrolledCourses.push(enrolledCourse);
    }

    const saved = await courseStudent.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error("Create course student error:", error);
    next(error);
  }
};



export const getAllCourseStudents = async (req, res, next) => {
  try {
    const students = await CourseStudentModel.find().populate('enrolledCourses.courseId', 'title');
    res.status(200).json(students);
  } catch (error) {
    next(error);
  }
};



export const updateCourseStudent = async (req, res, next) => {
  try {
    const { id } = req.params; 
    const { enrolledCourses } = req.body;

    const updated = await CourseStudent.findByIdAndUpdate(
      id,
      { enrolledCourses },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "CourseStudent not found" });

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteCourseStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await CourseStudent.findByIdAndDelete(id);

    if (!deleted) return res.status(404).json({ message: "CourseStudent not found" });

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
    if (!courseStudent) return res.status(404).json({ message: "CourseStudent not found" });

    const course = courseStudent.enrolledCourses.find(c => c.courseId.equals(courseId));
    if (!course) return res.status(404).json({ message: "Course not found in enrolledCourses" });

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

    const courseStudent = await CourseStudent.findById(id).populate('enrolledCourses.courseId', 'title image category');
    if (!courseStudent) {
      return res.status(404).json({ message: "CourseStudent not found" });
    }
    const enrolledCourse = courseStudent.enrolledCourses.find(c => c.courseId.equals(courseId));

    if (!enrolledCourse) {
      return res.status(404).json({ message: "Enrolled course not found" });
    }

    res.status(200).json(enrolledCourse);
  } catch (error) {
    next(error);
  }
};
