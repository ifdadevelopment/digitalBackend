import Course from "../models/CourseModel.js";
import { v4 as uuidv4 } from "uuid";

// CREATE COURSE
export const createCourse = async (req, res, next) => {
  try {
    const data = req.body;

    if (!data.title || !data.type) {
      return res.status(400).json({
        success: false,
        message: "'title' and 'type' fields are required.",
      });
    }

    if (!["Student", "Business"].includes(data.type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course type. Must be 'Student' or 'Business'.",
      });
    }

    const existing = await Course.findOne({ title: data.title, type: data.type });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A ${data.type.toLowerCase()} course with this title already exists.`,
      });
    }

    data.courseId = uuidv4();

    // Cleanup based on course type
    if (data.type === "Business") {
      delete data.previewVideo;
      delete data.whatYouWillLearn;
      delete data.price;
      delete data.salePrice;
      delete data.topics;
      delete data.requirements;
    } else if (data.type === "Student") {
      delete data.downloadBrochure;
    }

    const newCourse = new Course(data);
    const savedCourse = await newCourse.save();

    res.status(201).json({
      success: true,
      message: "Course created successfully.",
      data: savedCourse,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate entry. A course with the same title and type already exists.",
        key: error.keyValue,
      });
    }
    next(error);
  }
};

// GET ALL COURSES
export const getAllCourses = async (req, res, next) => {
  try {
    const { type, search, category } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (category) filter.category = new RegExp(category, "i");
    if (search) filter.title = new RegExp(search, "i");

    const courses = await Course.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: courses.length,
      courses,
    });
  } catch (error) {
    next(error);
  }
};

// GET COURSE BY ID
export const getCourseById = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    let course = await Course.findOne({ courseId, type: "Student" });

    if (!course) {
      course = await Course.findOne({ courseId, type: "Business" });
    }

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.status(200).json({
      success: true,
      course,
      courseType: course.type,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE COURSE
export const deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await Course.findOneAndDelete({ courseId: id });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE COURSE
export const editCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    const updatedCourse = await Course.findOneAndUpdate(
      { courseId: id },
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      course: updatedCourse,
    });
  } catch (error) {
    next(error);
  }
};
