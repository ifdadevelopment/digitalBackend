import Blog from "../models/Blog.js";
import { v4 as uuidv4 } from "uuid";


export const createBlog = async (req, res) => {
  try {
    const blogData = {
      ...req.body,
      id: uuidv4(), 
    };

    const blog = new Blog(blogData);
    await blog.save();

    res.status(201).json(blog);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAllBlogs = async (_req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    res.status(200).json(blog);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBlog = async (req, res) => {
  try {
    const updatedBlog = await Blog.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedBlog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    res.status(200).json(updatedBlog);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteBlog = async (req, res) => {
  try {
    const deletedBlog = await Blog.findByIdAndDelete(req.params.id);
    if (!deletedBlog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    res.status(200).json({ success: true, message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addComment = async (req, res) => {
  const { name, email, text } = req.body;
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    blog.comments.push({ name, email, text });
    await blog.save();

    res.status(201).json({ success: true, message: "Comment added", comments: blog.comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
