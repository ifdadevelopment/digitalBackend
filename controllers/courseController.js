import Course from "../models/CourseModel.js";
import { v4 as uuidv4 } from "uuid";

// CREATE COURSE
export const createCourse = async (req, res) => {
  try {
    const data = { ...req.body };
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

    const exists = await Course.findOne({ title: data.title, type: data.type });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Course already exists.",
      });
    }
  const jsonFields = ["whatYouWillLearn", "topics", "includes", "requirements"];
for (const field of jsonFields) {
  if (data[field]) {
    try {
      const parsed = typeof data[field] === "string" ? JSON.parse(data[field]) : data[field];

      if (Array.isArray(parsed)) {
        data[field] = parsed;
      } else {
        return res.status(400).json({
          success: false,
          message: `Invalid array format in '${field}'`,
        });
      }
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: `Invalid JSON in '${field}'`,
      });
    }
  }
}

    if (req.s3Uploads?.length) {
      const fileMap = {};
      for (const file of req.s3Uploads) {
        if (!fileMap[file.field]) fileMap[file.field] = [];
        fileMap[file.field].push(file.url);
      }

      const singleFields = ["image", "previewVideo", "downloadBrochure"];
      for (const [field, urls] of Object.entries(fileMap)) {
        data[field] = singleFields.includes(field) && urls.length === 1 ? urls[0] : urls;
      }
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
    const saved = await newCourse.save();

    return res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: saved,
    });

  } catch (err) {
    console.error("❌ Create Course Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
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
    const { courseId } = req.params;

    const deleted = await Course.findOneAndDelete({ courseId });

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

    const updateFields = { ...req.body };
    const arrayFields = ["whatYouWillLearn", "topics", "includes", "requirements"];
    arrayFields.forEach((key) => {
      if (typeof updateFields[key] === "string") {
        try {
          updateFields[key] = JSON.parse(updateFields[key]);
        } catch {
          updateFields[key] = updateFields[key].split(",").map((item) => item.trim());
        }
      }
    });
    if (req.files) {
      if (req.files.previewVideo?.[0]) {
        updateFields.previewVideo = req.files.previewVideo[0].path;
      }
      if (req.files.downloadBrochure?.[0]) {
        updateFields.downloadBrochure = req.files.downloadBrochure[0].path;
      }
      if (req.files.image?.[0]) {
        updateFields.image = req.files.image[0].path;
      }
    }
    if (updateFields.type === "Business") {
      delete updateFields.previewVideo;
      delete updateFields.whatYouWillLearn;
      delete updateFields.price;
      delete updateFields.salePrice;
      delete updateFields.topics;
      delete updateFields.requirements;
    } else if (updateFields.type === "Student") {
      delete updateFields.downloadBrochure;
    }
    const updatedCourse = await Course.findOneAndUpdate(
      { courseId: id },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({
        success: false,
        message: `Course not found with courseId: ${id}`,
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