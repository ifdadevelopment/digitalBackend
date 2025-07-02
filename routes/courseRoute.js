import express from "express";
import {
  createCourse,
  getAllCourses,
  getCourseById,
  deleteCourse,
} from "../controllers/courseController.js";
import { isAdmin, verifyUser } from "../middleware/auth.js";



const courseRouter = express.Router();

courseRouter.post("/create", verifyUser, isAdmin, createCourse); 
courseRouter.get("/", getAllCourses);
courseRouter.get("/:id", getCourseById); 
courseRouter.delete("/:id", verifyUser, isAdmin, deleteCourse); 

export default courseRouter;
