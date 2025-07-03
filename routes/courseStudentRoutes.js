
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

courseStudentRouter.get("/getCourseDetails",isAdmin, getAllCourseStudents);
courseStudentRouter.get("/:id/course/:courseId",verifyPurchasedCourse, getCourseStudentCourseDetails);
courseStudentRouter.post("/create", createCourseStudent);
courseStudentRouter.put("/:id", updateCourseStudent);
courseStudentRouter.delete("/:id", deleteCourseStudent);
courseStudentRouter.patch("/:id/progress", updateProgress); 

export default courseStudentRouter;
