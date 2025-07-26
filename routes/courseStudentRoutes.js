import express from "express";
import multer from "multer";

const upload = multer({ dest: "temp/" });
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


courseStudentRouter.get("/all", getAllEnrolledCourses);
courseStudentRouter.get("/getCourseByUser", verifyUser, getPurchasedEnrolledCourseDetailsByUser);
courseStudentRouter.post(
  "/create",
  verifyUser,
  isAdmin,
   upload.any(),
  multerErrorHandler,
  extractS3Uploads,
  createCourseStudent
);
courseStudentRouter.get("/:courseId", verifyUser, getCourseResume);
courseStudentRouter.post("/finalTest", verifyUser, addFinalTestToCourse);
courseStudentRouter.put("/:courseId", verifyUser, updateCourseResume);
courseStudentRouter.put("/enrolled/:courseId",   upload.any(),verifyUser,isAdmin,
  multerErrorHandler,
  extractS3Uploads,  updateCourseStudent);
courseStudentRouter.patch("/progress/:courseId", verifyUser, updateProgress);
courseStudentRouter.delete("/:courseId",verifyUser, isAdmin, deleteCourseStudent);


export default courseStudentRouter;