import express from "express";
import { registerUser, loginUser, updateUserProfile, logoutUser } from "../controllers/userController.js";
import verifyUser from "../middleware/auth.js";
//route to handle user registration, login, profile update, and logout  
const userRouter = express.Router();
userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.put("/update-profile", verifyUser, updateUserProfile);
userRouter.delete("/logout", logoutUser);

export default userRouter;
