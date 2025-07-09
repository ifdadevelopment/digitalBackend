import express from "express";
import {
  createCourseStudent,
  getAllEnrolledCourses,
  getPurchasedEnrolledCourseDetailsByUser,
  updateCourseStudent,
  deleteCourseStudent,
  getCourseResume,
  updateCourseResume,
  updateProgress
} from "../controllers/courseStudentController.js";
import { isAdmin, verifyUser } from "../middleware/auth.js";
const courseStudentRouter = express.Router();
courseStudentRouter.get("/all", isAdmin, getAllEnrolledCourses);
courseStudentRouter.get("/getCourseByUser", verifyUser, getPurchasedEnrolledCourseDetailsByUser);
courseStudentRouter.post("/create", verifyUser, createCourseStudent);
courseStudentRouter.get("/:courseId", verifyUser, getCourseResume);
courseStudentRouter.put("/:courseId", verifyUser, updateCourseResume);
courseStudentRouter.put("/:id", isAdmin, updateCourseStudent);
courseStudentRouter.patch("/:id/progress", verifyUser, updateProgress);
courseStudentRouter.delete("/:id", isAdmin, deleteCourseStudent);
courseStudentRouter.delete("/:id", isAdmin, deleteCourseStudent);

export default courseStudentRouter;

