import userModel from "../models/UserModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import validator from "validator";
import { errorHandler } from "../utils/error.js";
import { deleteS3File } from "../utils/deleteS3File.js";

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

// ✅ UPDATE USER PROFILE WITH IMAGE SUPPORT
export const updateUserProfile = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { name, phone, address, oldPassword, newPassword, confirmNewPassword } = req.body;

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = address;

    if (req.s3Uploads?.length) {
      const profileImg = req.s3Uploads.find(f => f.field === "profileImage");
      if (profileImg) {
        user.profileImage = profileImg.url;
      }
    }

    if (oldPassword && newPassword && confirmNewPassword) {
      const isMatch = await user.comparePassword(oldPassword);
      if (!isMatch) return res.status(400).json({ success: false, message: "Incorrect old password" });

      if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ success: false, message: "New passwords do not match" });
      }

      user.password = newPassword;
    }

    await user.save();

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Update failed", error: err.message });
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