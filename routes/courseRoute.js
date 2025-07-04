import express from "express";
import {
  createCourse,
  getAllCourses,
  getCourseById,
  deleteCourse,
  editCourse,
} from "../controllers/courseController.js";
import { isAdmin, verifyUser } from "../middleware/auth.js";

const courseRouter = express.Router();

courseRouter.post("/create", verifyUser, isAdmin, createCourse);
courseRouter.put("/edit/:id", verifyUser, isAdmin, editCourse);
courseRouter.get("/courseAll", getAllCourses);
courseRouter.get("/:courseId", getCourseById); 
courseRouter.delete("/:id", verifyUser, isAdmin, deleteCourse);

export default courseRouter;
