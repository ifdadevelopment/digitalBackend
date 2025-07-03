import mongoose from "mongoose";
const ContentSchema = new mongoose.Schema({
  type: { type: String, enum: ["video", "pdf", "image", "test"], required: true },
  name: String,
  duration: String,
  url: String,
  completed: { type: Boolean, default: false },
  answers: [String],
  score: Number
}, { _id: false });
const TopicSchema = new mongoose.Schema({
  topicTitle: String,
  completed: { type: Boolean, default: false },
  contents: [ContentSchema]
}, { _id: false });
const ModuleSchema = new mongoose.Schema({
  moduleTitle: String,
  completed: { type: Boolean, default: false },
  description: String,
  topics: [TopicSchema]
}, { _id: false });
const FinalTestSchema = new mongoose.Schema({
  name: String,
  type: { type: String, enum: ["test"], default: "test" },
  questions: [{
    question: String,
    options: [String],
    answer: String
  }],
  completed: { type: Boolean, default: false },
  score: Number,
  answers: [String]
}, { _id: false });

const CourseProgressSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true }, 
  title: String,
  image: String,
  badge: String,
  level: String,
  tags: [String],
  totalHours: Number,
  watchedHours: { type: Number, default: 0 },
  progressPercent: { type: Number, default: 0 },
  modules: [ModuleSchema],
  finalTest: FinalTestSchema,
  enrolledAt: { type: Date, default: Date.now }
}, { _id: false });

const CourseStudentSchema = new mongoose.Schema({
  enrolledCourses: [CourseProgressSchema]
}, { timestamps: true });

export default mongoose.model("CourseStudent", CourseStudentSchema);
