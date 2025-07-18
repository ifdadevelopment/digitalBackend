import Blog from "../models/Blog.js";
import { v4 as uuidv4 } from "uuid";

export const createBlog = async (req, res) => {
  try {
    const blogData = {
      ...req.body,
      id: uuidv4(),
    };
    if (req.s3Uploads?.length) {
      const fileMap = {};
      for (const file of req.s3Uploads) {
        if (!fileMap[file.field]) fileMap[file.field] = [];
        fileMap[file.field].push(file.url);
      }
      if (fileMap.blogImage?.[0]) blogData.coverImage = fileMap.blogImage[0];
      if (fileMap.blogAImages?.[0]) blogData.author = { ...blogData.author, image: fileMap.blogAImages[0] };
      if (blogData.content) {
        const contentBlocks = JSON.parse(blogData.content);
        const updatedBlocks = contentBlocks.map((block, i) => {
          if (block.type === "image" && block.attrs?.localId !== undefined) {
            const field = `content-image-${block.attrs.localId}`;
            const matched = req.s3Uploads.find(f => f.field === field);
            if (matched) block.value = matched.url;
          }
          return block;
        });
        blogData.content = updatedBlocks;
      }
    }

    const blog = new Blog(blogData);
    await blog.save();

    res.status(201).json(blog);
  } catch (error) {
    console.error("Create blog error:", error);
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
  const { name, email, text, rating } = req.body;

  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    blog.comments.push({ name, email, text, rating });
    await blog.save();

    res.status(201).json({
      success: true,
      message: "Comment added",
      comments: blog.comments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

