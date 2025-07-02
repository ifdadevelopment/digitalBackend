import mongoose from "mongoose";

const formModelSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      match: [/\S+@\S+\.\S+/, "Invalid email format"],
    },
    phone: {
      type: String,
    },
    subject: {
      type: String,
    },
    message: {
      type: String,
      required: [true, "Message is required"],
    },
    course: {
      type: String,
    },
    consent: {
      type: Boolean,
      required: true,
    },
    type: {
      type: String,
      enum: ["brochure", "connect", "general"],
      default: "general",
    },
  },
  { timestamps: true }
);

export default mongoose.model("FormModel", formModelSchema);
