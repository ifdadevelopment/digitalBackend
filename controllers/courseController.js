import Course from "../models/CourseModel.js";

import { v4 as uuidv4 } from "uuid";

export const createCourse = async (req, res) => {
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

    console.error("Create course error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create course.",
      error: error.message,
    });
  }
};

export const getAllCourses = async (req, res) => {
  try {
    const { type, search, category } = req.query;
    const filter = {};

    if (type) {
      filter.type = type;
    }

    if (category) {
      filter.category = new RegExp(category, "i");
    }

    if (search) {
      filter.title = new RegExp(search, "i");
    }

    const courses = await Course.find(filter);
    res.json({ success: true, count: courses.length, courses });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ success: false, message: "Failed to fetch courses" });
  }
};


export const getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findOne({ courseId, type: "Student" });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or not a Student type course",
      });
    }

    return res.status(200).json({ success: true, course });
  } catch (error) {
    console.error("Error fetching course:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch course",
    });
  }
};


export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Course.findOneAndDelete({ courseId: id });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    res.status(200).json({ success: true, message: "Course deleted successfully" });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ success: false, message: "Failed to delete course" });
  }
};


export const editCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    const updatedCourse = await Course.findOneAndUpdate(
      { courseId: id },
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    res.json({
      success: true,
      message: "Course updated successfully",
      course: updatedCourse,
    });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ success: false, message: "Failed to update course" });
  }
};
