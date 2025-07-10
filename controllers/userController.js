import userModel from "../models/UserModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import validator from "validator";
import { errorHandler } from "../utils/error.js";

const createToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
export const registerUser = async (req, res, next) => {
  const { name, email, password, confirmPassword } = req.body;

  try {
    if (!name || !email || !password || !confirmPassword)
      return next(errorHandler(400, "All fields are required"));

    if (!validator.isEmail(email))
      return next(errorHandler(400, "Invalid email format"));

    if (password !== confirmPassword)
      return next(errorHandler(400, "Passwords do not match"));

    if (password.length < 8)
      return next(errorHandler(400, "Password must be at least 8 characters"));

    const userExists = await userModel.findOne({ email });
    if (userExists)
      return next(errorHandler(400, "User already exists"));

    const newUser = new userModel({ name, email, password, confirmPassword });
    await newUser.save();
    const token = createToken(newUser._id);
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    const userData = await userModel.findById(newUser._id).select("-password");
    res.json({ success: true, user: userData, token });
  } catch (error) {
    next(errorHandler(500, "Error registering user"));
  }
};

// ✅ LOGIN USER (Supports both Admin & Student)
export const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    if (!email || !password)
      return next(errorHandler(400, "Please provide all fields"));

    const user = await userModel.findOne({ email }).select("+password");
    if (!user) return next(errorHandler(404, "User not found"));

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return next(errorHandler(400, "Incorrect password"));

    const token = createToken(user._id);
    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const userData = await userModel.findById(user._id).select("-password");

    res.json({
      success: true,
      user: userData,
      token,
      role: userData.role || (userData.admin ? "admin" : "student"), 
    });
  } catch (error) {
    next(errorHandler(500, "Login failed"));
  }
};

// ✅ GET AUTHENTICATED USER PROFILE
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user._id).select("-password");
    if (!user) return next(errorHandler(404, "User not found"));

    res.json({
      success: true,
      user,
      role: user.role || (user.admin ? "admin" : "student"),
    });
  } catch (error) {
    next(errorHandler(500, "Failed to load user"));
  }
};

// ✅ UPDATE USER PROFILE
export const updateUserProfile = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmNewPassword, ...otherData } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    const user = await userModel.findById(req.user.id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (oldPassword || newPassword || confirmNewPassword) {
      if (!oldPassword || !newPassword || !confirmNewPassword) {
        return res.status(400).json({ message: "All password fields are required" });
      }

      const isMatch = await user.comparePassword(oldPassword);
      if (!isMatch) {
        return res.status(400).json({ message: "Old password is incorrect" });
      }

      if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }

      user.password = newPassword;
    }

    Object.assign(user, otherData);
    await user.save();

    const { password, ...safeUser } = user.toObject();

    res.status(200).json({
      success: true,
      user: safeUser,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// ✅ LOGOUT
export const logoutUser = async (req, res, next) => {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    res.clearCookie("token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
    });

    res.status(200).json({
      success: true,
      message: "User logged out successfully",
    });
  } catch (error) {
    next(errorHandler(500, "Failed to logout user"));
  }
};
// Get all user  details for admin 
export const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.find().select("-password");

    res.status(200).json({
      success: true,
      users,
      totalUsers: users.length,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: err.message,
    });
  }
};
