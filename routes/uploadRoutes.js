import express from "express";
import multer from "multer";
import {
  uploadSingle,
  uploadChunk,
  completeUpload,
} from "../controllers/uploadController.js";

const uploadRouter = express.Router();

const upload = multer({
  dest: "tmp/",
  limits: { fileSize: 4 * 1024 * 1024 * 1024 },
});

uploadRouter.post("/", upload.single("chunk"), (req, res) => {
  const fileSize = req.file?.size || 0;

  if (fileSize <= 20 * 1024 * 1024) {
    return uploadSingle(req, res);
  } else {
    return uploadChunk(req, res);
  }
});

uploadRouter.post("/complete", completeUpload);

export default uploadRouter;


