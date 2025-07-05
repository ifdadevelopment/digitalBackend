
import express from "express";
import {
  getAllCourseStudents,
  createCourseStudent,
  updateCourseStudent,
  deleteCourseStudent,
  updateProgress,
  getCourseStudentCourseDetails
} from "../controllers/courseStudentController.js";
import { isAdmin } from "../middleware/auth.js";
import { verifyPurchasedCourse } from "../middleware/checkPurchased.js";

const courseStudentRouter = express.Router();

courseStudentRouter.get("/getCourseDetails", getAllCourseStudents);
courseStudentRouter.get("/:courseId", getCourseStudentCourseDetails);
courseStudentRouter.post("/create", createCourseStudent);
courseStudentRouter.put("/:id", updateCourseStudent);
courseStudentRouter.delete("/:id", deleteCourseStudent);
courseStudentRouter.patch("/:id/progress", updateProgress); 

export default courseStudentRouter;
