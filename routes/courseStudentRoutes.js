import express from "express";
import {
  createCourseStudent,
  getAllCourseStudents,
  getPurchasedEnrolledCourseDetailsByUser,
  updateCourseStudent,
  deleteCourseStudent,
  updateProgress
} from "../controllers/courseStudentController.js";
import { isAdmin, verifyUser } from "../middleware/auth.js";
const courseStudentRouter = express.Router();
courseStudentRouter.get("/all", isAdmin, getAllCourseStudents);
courseStudentRouter.get("/getCourseByUser", verifyUser, getPurchasedEnrolledCourseDetailsByUser);
courseStudentRouter.post("/create", verifyUser, createCourseStudent);
courseStudentRouter.put("/:id", isAdmin, updateCourseStudent);
courseStudentRouter.patch("/:id/progress", verifyUser, updateProgress);
courseStudentRouter.delete("/:id", isAdmin, deleteCourseStudent);
courseStudentRouter.delete("/:id", isAdmin, deleteCourseStudent);

export default courseStudentRouter;

