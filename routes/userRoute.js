import express from "express";
import { registerUser, loginUser, updateUserProfile,getUserProfile, logoutUser, getAllUsers } from "../controllers/userController.js";
import { verifyUser } from "../middleware/auth.js";
 
const userRouter = express.Router();
userRouter.post("/register", registerUser);
userRouter.get("/me",verifyUser, getUserProfile);
userRouter.get("/all", getAllUsers);
userRouter.post("/login", loginUser);
userRouter.put("/update-profile", verifyUser, updateUserProfile);
userRouter.delete("/logout", logoutUser);

export default userRouter;
