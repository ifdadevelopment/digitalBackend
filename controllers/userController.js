import userModel from "../models/UserModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import validator from "validator";

const createToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

export const registerUser = async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password || !confirmPassword)
    return res.json({ success: false, message: "All fields are required" });

  if (!validator.isEmail(email))
    return res.json({ success: false, message: "Invalid email format" });

  if (password !== confirmPassword)
    return res.json({ success: false, message: "Passwords do not match" });

  if (password.length < 8)
    return res.json({
      success: false,
      message: "Password must be at least 8 characters",
    });

  try {
    const userExists = await userModel.findOne({ email });
    if (userExists)
      return res.json({ success: false, message: "User already exists" });

    const newUser = new userModel({ name, email, password, confirmPassword });
    await newUser.save();

    const token = createToken(newUser._id);
    const userData = await userModel.findById(newUser._id).select("-password");

    return res.json({
      success: true,
      user: userData,
      token,
    });
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: "Error registering user" });
  }
};


export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.json({ success: false, message: "Please provide all fields" });

  try {
    const user = await userModel.findOne({ email }).select("+password");
    if (!user)
      return res.json({ success: false, message: "User not found" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.json({ success: false, message: "Incorrect password" });

    const token = createToken(user._id);

    const userData = await userModel.findById(user._id).select("-password");

    return res.json({
      success: true,
      user: userData,
      token,
    });
  } catch (error) {
    return res.json({ success: false, message: "Login failed" });
  }
};

export const logoutUser = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res
    .status(200)
    .json({ success: true, message: "User logged out successfully" });
};

export const updateUserProfile = async (req, res) => {
  const userId = req.user._id;
  const {
    name,
    phone,
    address,
    profileImage,
    linkedin,
    facebook,
    instagram,
    password,
    confirmPassword,
  } = req.body;
  const getInitials = (name = "") => {
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || "";
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
  };

  try {
    const user = await userModel.findById(userId).select("+password");
    if (!user)
      return res.json({ success: false, message: "User not found" });

    if (name) {
      user.name = name;
      if (!profileImage) {
        user.profileImage = getInitials(name);
      }
    }
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (linkedin) user.linkedin = linkedin;
    if (facebook) user.facebook = facebook;
    if (instagram) user.instagram = instagram;
    if (profileImage) user.profileImage = profileImage;

    if (password || confirmPassword) {
      if (password !== confirmPassword) {
        return res.json({ success: false, message: "Passwords do not match" });
      }
      if (password.length < 8) {
        return res.json({
          success: false,
          message: "Password must be at least 8 characters",
        });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    const updatedUser = await userModel.findById(userId).select("-password");

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: "Error updating profile" });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load user" });
  }
};
