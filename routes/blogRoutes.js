import express from "express";
import {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  addComment,
} from "../controllers/blogController.js";

const blogRouter = express.Router();
blogRouter.post("/create", createBlog);       
blogRouter.get("/blogsAll", getAllBlogs);        
blogRouter.get("/:id", getBlogById);    
blogRouter.put("/:id", updateBlog);       
blogRouter.delete("/:id", deleteBlog);  
blogRouter.post("/:id/comment", addComment);

export default blogRouter;
