import express from "express";
import {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  addComment,
} from "../controllers/blogController.js";
import { extractS3Uploads, getUploadMiddleware } from "../middleware/upload.js";

const blogRouter = express.Router();
const allowedFields = [
  { name: "blogImage", maxCount: 1 },          
  { name: "blogAImages", maxCount: 1 },
  { name: /^content-image-\d+$/, maxCount: 1 },  
];
blogRouter.post("/create",  getUploadMiddleware(allowedFields),
  extractS3Uploads, createBlog);       
blogRouter.get("/blogsAll", getAllBlogs);        
blogRouter.get("/:id", getBlogById);    
blogRouter.put("/:id",getUploadMiddleware(allowedFields),
  extractS3Uploads, updateBlog);       
blogRouter.delete("/:id", deleteBlog);  
blogRouter.post("/:id/comment", addComment);

export default blogRouter;