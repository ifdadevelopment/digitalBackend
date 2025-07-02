import Course from "../models/CourseModel.js";
export const createCourse = async (req, res) => {
  try {
    const {
      id,
      title,
      subtitle,
      rating,
      image,
      reviewsCount,
      studentsEnrolled,
      lastUpdated,
      category,
      type,
      previewVideo,
      whatYouWillLearn,
      modules,
      price,
      salePrice,
      topics,
      includes,
      curriculum,
      requirements,
      description,
      downloadBrochure,
    } = req.body;
    if (!id || !title || !type) {
      return res.status(400).json({ success: false, message: "ID, title, and type are required." });
    }

    const existing = await Course.findOne({ id });
    if (existing) {
      return res.status(400).json({ success: false, message: "Course ID already exists." });
    }

    const newCourse = new Course({
      id,
      title,
      subtitle,
      rating,
      image,
      reviewsCount,
      studentsEnrolled,
      lastUpdated,
      category,
      type,
      previewVideo,
      whatYouWillLearn,
      modules,
      price,
      salePrice,
      topics,
      includes,
      curriculum,
      requirements,
      description,
      downloadBrochure,
    });

    await newCourse.save();
    res.status(201).json({ success: true, course: newCourse });
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
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
    const { id } = req.params;
    const course = await Course.findOne({ id });
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    res.json({ success: true, course });
  } catch (error) {
    console.error("Error fetching course:", error);
    res.status(500).json({ success: false, message: "Failed to fetch course" });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Course.findOneAndDelete({ id });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    res.json({ success: true, message: "Course deleted successfully" });
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
      { id },
      updateFields,
      { new: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    res.json({ success: true, message: "Course updated successfully", course: updatedCourse });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ success: false, message: "Failed to update course" });
  }
};
