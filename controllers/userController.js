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

export const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    if (!email || !password)
      return next(errorHandler(400, "Please provide all fields"));

    const user = await userModel.findOne({ email }).select("+password");
    if (!user)
      return next(errorHandler(404, "User not found"));

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return next(errorHandler(400, "Incorrect password"));

    const token = createToken(user._id);
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    const userData = await userModel.findById(user._id).select("-password");
    res.json({ success: true, user: userData, token });
  } catch (error) {
    next(errorHandler(500, "Login failed"));
  }
};


export const updateUserProfile = async (req, res, next) => {
  const userId = req.user._id;
  const { name, phone, address, profileImage, linkedin, facebook, instagram, password, confirmPassword } = req.body;

  try {
    const user = await userModel.findById(userId).select("+password");
    if (!user)
      return next(errorHandler(404, "User not found"));

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (linkedin) user.linkedin = linkedin;
    if (facebook) user.facebook = facebook;
    if (instagram) user.instagram = instagram;
    if (profileImage) user.profileImage = profileImage;

    if (password || confirmPassword) {
      if (password !== confirmPassword)
        return next(errorHandler(400, "Passwords do not match"));
      if (!password || password.length < 8)
        return next(errorHandler(400, "Password must be at least 8 characters"));
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();
    const updatedUser = await userModel.findById(userId).select("-password");
    res.json({ success: true, message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    next(errorHandler(500, "Error updating profile"));
  }
};
export const logoutUser = async (req, res, next) => {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    res.clearCookie("token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
    });
    res.status(200).json({ success: true, message: "User logged out successfully" });
  } catch (error) {
    next(errorHandler(500, "Failed to logout user"));
  }
};


export const getUserProfile = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user._id).select("-password");
    if (!user) {
      return next(errorHandler(404, "User not found"));
    }
    res.json({ success: true, user });
  } catch (error) {
    next(errorHandler(500, "Failed to load user"));
  }
};
