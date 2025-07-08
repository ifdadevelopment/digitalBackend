import mongoose from "mongoose";

const uploadSchema = new mongoose.Schema({
  fileId: { type: String, required: true, unique: true },
  fileName: String,
  key: String,
  uploadId: String,
  totalChunks: Number,
  parts: [
    {
      PartNumber: Number,
      ETag: String,
    },
  ],
  completed: { type: Boolean, default: false },
  url: String, 
}, { timestamps: true });

export const Upload = mongoose.model("Upload", uploadSchema);
