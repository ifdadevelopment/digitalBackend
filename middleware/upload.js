import multer from "multer";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

// Initialize S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const MAX_FILE_SIZE = 4 * 1024 * 1024 * 1024; // 4GB

// Multer config (memory-based)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
});

export const uploadSingle = upload.single("file");
export const uploadMultiple = upload.array("files", 10);

// Upload file to S3 and return signed URL
const uploadBufferToS3 = async (fileBuffer, originalName, mimetype, folder = "uploads") => {
  const uniqueKey = `${folder}/${uuidv4()}_${originalName}`;

  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: uniqueKey,
    Body: fileBuffer,
    ContentType: mimetype,
  };

  await s3.send(new PutObjectCommand(uploadParams));

  // Generate signed URL (1 hour validity)
  const signedUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: uniqueKey,
    }),
    { expiresIn: 60 * 60 } // 1 hour
  );

  return {
    name: originalName,
    key: uniqueKey,
    type: mimetype,
    size: fileBuffer.length,
    signedUrl, // secure access
  };
};

// Middleware handler
export const handleUploadToS3 = async (req, res, next) => {
  try {
    const files = req.file ? [req.file] : req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }

    const uploads = await Promise.all(
      files.map((file) =>
        uploadBufferToS3(file.buffer, file.originalname, file.mimetype)
      )
    );

    req.s3Uploads = uploads;

    res.status(200).json({
      success: true,
      message: "File(s) uploaded to S3 successfully",
      data: uploads,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Upload failed",
      error: error.message,
    });
  }
};
