import Course from "../models/CourseModel.js";
import { v4 as uuidv4 } from "uuid";
import { deleteS3File } from "../utils/deleteS3File.js";

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

const customSplit = (input) => {
  const result = [];
  let current = '';
  let depth = 0;

  for (let char of input) {
    if (char === ',' && depth === 0) {
      result.push(current.trim());
      current = '';
    } else {
      if (char === '(') depth++;
      if (char === ')') depth--;
      current += char;
    }
  }

  if (current) result.push(current.trim());
  return result.filter(Boolean);
};

for (const field of jsonFields) {
  if (data[field]) {
    try {
      if (typeof data[field] === "string") {
        try {
          const parsed = JSON.parse(data[field]);
          if (Array.isArray(parsed)) {
            data[field] = parsed; // ✅ Save as array
          } else {
            return res.status(400).json({
              success: false,
              message: `Invalid array format in '${field}'`,
            });
          }
        } catch {
          const parsed = customSplit(data[field]);
          data[field] = parsed; 
        }
      } else if (Array.isArray(data[field])) {
        data[field] = data[field]; 
      } else {
        return res.status(400).json({
          success: false,
          message: `Invalid array format in '${field}'`,
        });
      }
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: `Invalid data in '${field}'`,
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

    const course = await Course.findOne({ courseId });
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const fileFields = ["image", "previewVideo", "downloadBrochure"];
    for (const field of fileFields) {
      const url = course[field];
      if (url) {
        try {
          await deleteS3File(url);
        } catch (err) {
          console.warn(`Failed to delete ${field} from S3:`, err.message);
        }
      }
    }

    await Course.findOneAndDelete({ courseId });

    res.status(200).json({
      success: true,
      message: "Course deleted and files removed from S3",
    });
  } catch (error) {
    next(error);
  }
};


// UPDATE COURSE
export const editCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const updateFields = { ...req.body };
    const arrayFields = ["whatYouWillLearn", "topics", "includes", "requirements"];
    arrayFields.forEach((key) => {
      if (typeof updateFields[key] === "string") {
        try {
          updateFields[key] = JSON.parse(updateFields[key]);
        } catch {
          updateFields[key] = updateFields[key]
            .split(",")
            .map((item) => item.trim());
        }
      }
    });

    const existingCourse = await Course.findOne({ courseId });
    if (!existingCourse) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    if (req.s3Uploads?.length) {
      const fileMap = {};
      for (const file of req.s3Uploads) {
        fileMap[file.field] = file.url;
      }
      const singleFields = ["image", "previewVideo", "downloadBrochure"];
      for (const field of singleFields) {
        const newUrl = fileMap[field];
        const oldUrl = existingCourse[field];

        if (newUrl && newUrl !== oldUrl) {
          if (oldUrl) {
            try {
              await deleteS3File(oldUrl);
            } catch (err) {
              console.warn(`⚠️ Failed to delete old ${field} from S3:`, err.message);
            }
          }
          updateFields[field] = newUrl;
        } else if (!newUrl && oldUrl) {
          updateFields[field] = oldUrl; 
        }
      }
    } else {
      ["image", "previewVideo", "downloadBrochure"].forEach((field) => {
        if (existingCourse[field]) {
          updateFields[field] = existingCourse[field];
        }
      });
    }
    if (updateFields.type === "Business") {
      Object.assign(updateFields, {
        previewVideo: undefined,
        whatYouWillLearn: undefined,
        price: undefined,
        salePrice: undefined,
        topics: undefined,
        requirements: undefined,
      });
    } else if (updateFields.type === "Student") {
      updateFields.downloadBrochure = undefined;
    }

    const updatedCourse = await Course.findOneAndUpdate(
      { courseId },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      course: updatedCourse,
    });
  } catch (error) {
    next(error);
  }
};