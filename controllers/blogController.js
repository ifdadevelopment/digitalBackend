import Blog from "../models/Blog.js";
import { v4 as uuidv4 } from "uuid";

// Blog creation controller
export const createBlog = async (req, res, next) => {
  try {
    const { title, excerpt, category, tags, content, authorName } = req.body;

    const blogData = {
      title: title?.trim(),
      excerpt: excerpt?.trim(),
      category,
      tags: tags?.split(",").map(tag => tag.trim()),
      author: {
        name: authorName?.trim(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const fileMap = {};
    for (const file of req.s3Uploads || []) {
      if (!fileMap[file.field]) fileMap[file.field] = [];
      fileMap[file.field].push(file.url);
    }
    if (fileMap.blogImage?.[0]) {
      blogData.coverImage = fileMap.blogImage[0];
    }

    if (fileMap.blogAImages?.[0]) {
      blogData.author.image = fileMap.blogAImages[0];
    }
    if (content) {
      const parsedContent = JSON.parse(content);

      const updatedContent = parsedContent.map((block) => {
        if (block.type === "image" && block.attrs?.localId !== undefined) {
          const field = `content-image-${block.attrs.localId}`;
          const imageUrl = fileMap[field]?.[0];
          if (imageUrl) {
            block.value = imageUrl;
          }
        }
        return block;
      });

      blogData.content = updatedContent;
    }
    const blog = new Blog(blogData);
    await blog.save();

    res.status(201).json({ success: true, data: blog });
  } catch (error) {
    console.error("❌ Blog creation error:", error);
    next(error);
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
    const { id } = req.params;
    const blog = await Blog.findOne({ id });

    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    const uploads = req.s3Uploads || [];
    const newCoverImage = uploads.find(f => f.field === "blogImage")?.url;
    const newAuthorImage = uploads.find(f => f.field === "blogAImages")?.url;
    if (newCoverImage && blog.coverImage) {
      await deleteS3Object(blog.coverImage);
    }
    if (newAuthorImage && blog.author?.image) {
      await deleteS3Object(blog.author.image);
    }

    const updated = await Blog.findOneAndUpdate(
      { id },
      {
        $set: {
          title: req.body.title || blog.title,
          excerpt: req.body.excerpt || blog.excerpt,
          category: req.body.category || blog.category,
          tags: JSON.parse(req.body.tags || JSON.stringify(blog.tags)),
          content: JSON.parse(req.body.content || JSON.stringify(blog.content)),
          ...(newCoverImage && { coverImage: newCoverImage }),
          ...(newAuthorImage && { "author.image": newAuthorImage }),
          ...(req.body.authorName && { "author.name": req.body.authorName }),
        },
      },
      { new: true }
    );

    res.status(200).json({ success: true, blog: updated });
  } catch (err) {
    console.error("❌ Update Blog Error:", err);
    res.status(500).json({ success: false, message: "Blog update failed" });
  }
};


export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findOne({ id });

    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    if (blog.coverImage) await deleteS3Object(blog.coverImage);
    if (blog.author?.image) await deleteS3Object(blog.author.image);

    await blog.deleteOne();

    res.status(200).json({ success: true, message: "Blog deleted" });
  } catch (err) {
    console.error("❌ Delete Blog Error:", err);
    res.status(500).json({ success: false, message: "Failed to delete blog" });
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