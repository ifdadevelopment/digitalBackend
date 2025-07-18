import express from "express";
import { registerUser, loginUser, updateUserProfile,getUserProfile, logoutUser, getAllUsers } from "../controllers/userController.js";
import { verifyUser } from "../middleware/auth.js";
import { extractS3Uploads, getUploadMiddleware } from "../middleware/upload.js";
 
const userRouter = express.Router();
const allowedFields = [
  { name: "profileImage", maxCount: 1 },
];

userRouter.post("/register", registerUser);
userRouter.get("/me",verifyUser, getUserProfile);
userRouter.get("/all", getAllUsers);
userRouter.post("/login", loginUser);
<<<<<<< HEAD
userRouter.put("/update-profile", verifyUser, getUploadMiddleware([{ name: "profileImage", maxCount: 1 }]),
  extractS3Uploads, updateUserProfile);
=======
userRouter.put(
  "/update-profile",
  verifyUser,
  getUploadMiddleware(allowedFields),
  extractS3Uploads, 
  updateUserProfile
);
>>>>>>> e63387d8b870611f2c67bb12cb71170905bc30c2
userRouter.delete("/logout", logoutUser);

export default userRouter;