import multer from "multer";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getCloudFrontUrl } from "../utils/s3Helpers.js";
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}-${uuidv4()}-${safeName}`);
  },
});
const createMulter = (maxFileSize = 4 * 1024 * 1024 * 1024) =>
  multer({
    storage: diskStorage,
    limits: { fileSize: maxFileSize },
  });
export const getUploadMiddleware = (fieldConfig = null) => {
  const instance = createMulter();
  return fieldConfig ? instance.fields(fieldConfig) : instance.any();
};

const cloudfrontUrl = process.env.CLOUDFRONT_URL;

export const extractS3Uploads = async (req, res, next) => {
  const bucket = process.env.AWS_BUCKET_NAME;
  const uploads = [];

  const files = Array.isArray(req.files)
    ? req.files
    : Object.values(req.files || {}).flat();

  if (!files.length) {
    console.log("⚠️ No files received.");
    return next();
  }

  try {
    for (const file of files) {
      const ext = path.extname(file.originalname).slice(1);
      const baseName = path
        .basename(file.originalname, path.extname(file.originalname))
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_-]/g, "");

      let folder = "others";
      if (file.fieldname.startsWith("content-image")) folder = "modules/images";
      else if (file.fieldname.startsWith("content-audio")) folder = "modules/audios";
      else if (file.fieldname.startsWith("content-video")) folder = "modules/videos";
      else if (file.fieldname.startsWith("content-pdf")) folder = "modules/pdfs";
      else if (file.fieldname === "image") folder = "courses/images";
      else if (file.fieldname === "profileImage") folder = "users/profileImages";
      else if (file.fieldname === "previewVideo") folder = "courses/previews";
      else if (file.fieldname === "downloadBrochure") folder = "courses/brochures";
      else if (file.fieldname === "blogImage") folder = "blogs/coverImages";
      else if (file.fieldname === "blogAImages") folder = "blogs/authorImages";
      else if (/^content-image-\d+/.test(file.fieldname)) folder = "blogs/contentBlocks";
      else if (/^course-image/.test(file.fieldname)) folder = "courses/contentBlocks";

      const key = `${folder}/${Date.now()}-${uuidv4()}-${baseName}.${ext}`;
      const fileBuffer = await fs.readFile(file.path);

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: fileBuffer,
          ContentType: file.mimetype,
          CacheControl: "public, max-age=31536000", 
        })
      );

      const publicUrl = getCloudFrontUrl(key);

      uploads.push({
        field: file.fieldname,
        url: publicUrl,
        key,
        originalName: file.originalname,
        type: file.mimetype,
        size: file.size,
      });

      await fs.unlink(file.path);
    }

    req.s3Uploads = uploads;
    next();
  } catch (err) {
    console.error("❌ S3 Upload Error:", err);
    res.status(500).json({
      success: false,
      message: "S3 upload failed",
      error: err.message,
    });
  }
};


