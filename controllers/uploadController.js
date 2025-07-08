import AWS from "aws-sdk";
import fs from "fs";
import { Upload } from "../models/Upload.js";

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// ✅ Direct upload (≤ 20MB)
export const uploadSingle = async (req, res) => {
  try {
    const { fileId, fileName } = req.body;
    const file = req.file;

    const buffer = fs.readFileSync(file.path);

    const key = `uploads/${fileId}-${fileName}`;
    const s3Res = await s3
      .upload({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: buffer,
      })
      .promise();

    fs.unlinkSync(file.path); // delete temp file

    const upload = new Upload({
      fileId,
      fileName,
      key,
      completed: true,
      url: s3Res.Location,
    });

    await upload.save();

    res.json({
      message: "Upload complete",
      location: s3Res.Location,
      key,
    });
  } catch (error) {
    console.error("Single upload error:", error);
    res.status(500).json({ error: "Single upload failed" });
  }
};

// ✅ Chunked multipart upload (≥ 20MB)
export const uploadChunk = async (req, res) => {
  try {
    const { fileId, fileName, chunkIndex, totalChunks } = req.body;
    const chunk = req.file;

    if (!chunk) return res.status(400).json({ error: "Missing chunk" });

    let upload = await Upload.findOne({ fileId });

    if (!upload) {
      const s3Res = await s3.createMultipartUpload({
        Bucket: process.env.S3_BUCKET,
        Key: `uploads/${fileId}-${fileName}`,
      }).promise();

      upload = new Upload({
        fileId,
        fileName,
        key: s3Res.Key,
        uploadId: s3Res.UploadId,
        totalChunks,
        parts: [],
      });

      await upload.save();
    }

    const buffer = fs.readFileSync(chunk.path);
    const partNum = Number(chunkIndex) + 1;

    const uploadPartRes = await s3
      .uploadPart({
        Bucket: process.env.S3_BUCKET,
        Key: upload.key,
        UploadId: upload.uploadId,
        PartNumber: partNum,
        Body: buffer,
      })
      .promise();

    fs.unlinkSync(chunk.path); // cleanup

    upload.parts[chunkIndex] = {
      PartNumber: partNum,
      ETag: uploadPartRes.ETag,
    };

    await upload.save();

    res.sendStatus(200);
  } catch (error) {
    console.error("Chunk upload error:", error);
    res.status(500).json({ error: "Chunk upload failed" });
  }
};

// ✅ Complete multipart upload
export const completeUpload = async (req, res) => {
  try {
    const { fileId } = req.body;

    const upload = await Upload.findOne({ fileId });
    if (!upload) return res.status(404).send("Upload not found");

    const sortedParts = upload.parts.sort((a, b) => a.PartNumber - b.PartNumber);

    const completeRes = await s3
      .completeMultipartUpload({
        Bucket: process.env.S3_BUCKET,
        Key: upload.key,
        UploadId: upload.uploadId,
        MultipartUpload: { Parts: sortedParts },
      })
      .promise();

    const s3Url = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${upload.key}`;

    upload.completed = true;
    upload.url = s3Url;
    await upload.save();

    res.json({
      message: "Upload complete",
      location: s3Url,
      key: upload.key,
    });
  } catch (error) {
    console.error("Complete upload error:", error);
    res.status(500).json({ error: "Failed to complete upload" });
  }
};
