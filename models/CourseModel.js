import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema({
  title: { type: String },
  duration: { type: String },
});

const curriculumSchema = new mongoose.Schema({
  section: { type: String },
  lectures: [lessonSchema],
});

const moduleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
  description: { type: String },
  lessons: [{ type: String }],
});

const courseSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, required: true },
    title: { type: String, required: true },
    subtitle: { type: String },
    rating: { type: Number, default: 0 },
    image: { type: String },
    reviewsCount: { type: Number, default: 0 },
    studentsEnrolled: { type: Number, default: 0 },
    lastUpdated: { type: String },
    category: { type: String },
    type: { type: String, enum: ["Student", "Business"], required: true }, 
    previewVideo: { type: String },
    whatYouWillLearn: [{ type: String }],
    modules: [moduleSchema],
    price: { type: Number },
    salePrice: { type: Number },
    topics: [{ type: String }],
    includes: [{ type: String }],
    curriculum: [curriculumSchema],
    requirements: [{ type: String }],
    description: { type: String },
    downloadBrochure: { type: String }, 
  },
  { timestamps: true }
);

courseSchema.pre("save", function (next) {
  if (this.type === "Business") {
    this.whatYouWillLearn = undefined;
    this.modules = undefined;
    this.topics = undefined;
    this.curriculum = undefined;
    this.requirements = undefined;
    this.previewVideo = undefined;
  } else if (this.type === "Student") {
    this.downloadBrochure = undefined;
  }
  next();
});

const Course = mongoose.model("Course", courseSchema);
export default Course;
