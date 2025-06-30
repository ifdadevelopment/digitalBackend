import express from "express";
import { registerUser, loginUser, updateUserProfile,getUserProfile, logoutUser } from "../controllers/userController.js";
import verifyUser from "../middleware/auth.js"; 
const userRouter = express.Router();
userRouter.post("/register", registerUser);
userRouter.post("/me",verifyUser, getUserProfile);
userRouter.post("/login", loginUser);
userRouter.put("/update-profile", verifyUser, updateUserProfile);
userRouter.delete("/logout", logoutUser);

export default userRouter;
