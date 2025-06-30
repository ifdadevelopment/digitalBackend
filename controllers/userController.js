import userModel from "../models/UserModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import validator from "validator";

const createToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

export const registerUser = async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password || !confirmPassword)
    return res.json({ success: false, message: "All fields are required" });

  if (!validator.isEmail(email))
    return res.json({ success: false, message: "Invalid email format" });

  if (password !== confirmPassword)
    return res.json({ success: false, message: "Passwords do not match" });

  if (password.length < 8)
    return res.json({ success: false, message: "Password must be at least 8 characters" });

  try {
    const userExists = await userModel.findOne({ email });
    if (userExists)
      return res.json({ success: false, message: "User already exists" });

    const newUser = new userModel({ name, email, password, confirmPassword });
    await newUser.save();

    const token = createToken(newUser._id);

    return res.json({
      success: true,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        profileImage: newUser.profileImage,
        createdAt: newUser.createdAt,
      },
      token
    });
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: "Error registering user" });
  }
};


export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.json({ success: false, message: "Please provide all fields", user: null, token: "" });

  try {
    const user = await userModel.findOne({ email }).select("+password");
    if (!user)
      return res.json({ success: false, message: "User not found", user: null, token: "" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.json({ success: false, message: "Incorrect password", user: null, token: "" });

    const token = createToken(user._id);
   const userData = await userModel.findById(user._id).select("-password");

    return res.json({
      success: true,
      user: {
        _id: userData._id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        phone: userData.phone,
        address: userData.address,
        linkedin: userData.linkedin,
        facebook: userData.facebook,
        instagram: userData.instagram,
        profileImage: userData.profileImage || "",
        createdAt: userData.createdAt,
      },
      token
    });
  } catch (error) {
    return res.json({ success: false, message: "Login failed", user: null, token: "" });
  }
};
export const logoutUser = async (req, res) => {
  res.json({ success: true, message: "User logged out successfully" });
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
    confirmPassword
  } = req.body;

  try {
    const user = await userModel.findById(userId).select("+password");
    if (!user) return res.json({ success: false, message: "User not found" });

    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.address = address || user.address;
    user.profileImage = profileImage || user.profileImage;
    user.linkedin = linkedin || user.linkedin;
    user.facebook = facebook || user.facebook;
    user.instagram = instagram || user.instagram;

    if (password || confirmPassword) {
      if (password !== confirmPassword) {
        return res.json({ success: false, message: "Passwords do not match" });
      }
      if (password.length < 8) {
        return res.json({ success: false, message: "Password must be at least 8 characters" });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();
    return res.json({ success: true, message: "Profile updated successfully" });
  } catch (error) {
    return res.json({ success: false, message: "Error updating profile" });
  }
};
