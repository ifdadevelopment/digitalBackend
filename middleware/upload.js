import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const MAX_FILE_SIZE = 4 * 1024 * 1024 * 1024;

const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    acl: "public-read",
    key: (req, file, cb) => {
      const folder = "uploads";
      const fileKey = `${folder}/${uuidv4()}_${file.originalname}`;
      cb(null, fileKey);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE },
});

export const uploadCourseAssets = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "previewVideo", maxCount: 1 },
  { name: "downloadBrochure", maxCount: 1 },
]);

const generatePublicUrls = async (files) => {
  const bucket = process.env.AWS_BUCKET_NAME;
  const region = process.env.AWS_REGION;

  return files.map((file) => {
    const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${file.key}`;
    return {
      field: file.fieldname,
      key: file.key,
      url: publicUrl,
      originalName: file.originalname,
      type: file.mimetype,
      size: file.size,
    };
  });
};

// === MIDDLEWARE: ADD PUBLIC URLs TO req.s3Uploads ===
export const extractS3Uploads = async (req, res, next) => {
  try {
    const allFiles = Object.values(req.files || {}).flat();
    if (!allFiles.length) {
      req.s3Uploads = [];
      return next();
    }

    req.s3Uploads = await generatePublicUrls(allFiles);
    next();
  } catch (err) {
    console.error("S3 Upload Extraction Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to process uploaded files",
      error: err.message,
    });
  }
};
