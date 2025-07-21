import express from "express";
import {
  createCourseStudent,
  getAllEnrolledCourses,
  getPurchasedEnrolledCourseDetailsByUser,
  updateCourseStudent,
  deleteCourseStudent,
  getCourseResume,
  updateCourseResume,
  updateProgress,
  addFinalTestToCourse
} from "../controllers/courseStudentController.js";
import { isAdmin, verifyUser } from "../middleware/auth.js";
import { getUploadMiddleware,extractS3Uploads } from "../middleware/upload.js";
import {multerErrorHandler} from "../utils/multerErrorHandler.js"
const courseStudentRouter = express.Router();

const allowedFields = [
  { name: "content-image", maxCount: 100 },
  { name: "content-audio", maxCount: 100 },
  { name: "content-video", maxCount: 100 },
  { name: "content-pdf", maxCount: 100 },
];
courseStudentRouter.get("/all", getAllEnrolledCourses);
courseStudentRouter.get("/getCourseByUser", verifyUser, getPurchasedEnrolledCourseDetailsByUser);
courseStudentRouter.post(
  "/create",
  verifyUser,
  isAdmin,
  getUploadMiddleware(allowedFields), 
  multerErrorHandler,
  extractS3Uploads,
  createCourseStudent
);
courseStudentRouter.get("/:courseId", verifyUser, getCourseResume);
courseStudentRouter.post("/finalTest", verifyUser, addFinalTestToCourse);
courseStudentRouter.put("/:courseId", verifyUser, updateCourseResume);
courseStudentRouter.put("/:id", isAdmin, updateCourseStudent);
courseStudentRouter.patch("/progress/:id", verifyUser, updateProgress);
courseStudentRouter.delete("/:id", isAdmin, deleteCourseStudent);


export default courseStudentRouter;

