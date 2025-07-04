import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [String],
  answer: { type: String, required: true },
  selectedAnswer: String,
  isCorrect: Boolean,
}, { _id: false });

const contentSchema = new mongoose.Schema({
  type: { type: String, enum: ['video', 'pdf', 'image', 'test'], required: true },
  name: String,
  duration: String,
  url: String,
  completed: { type: Boolean, default: false },
  score: Number,
  questions: [questionSchema],
}, { _id: false });

const topicSchema = new mongoose.Schema({
  topicId: {
    type: String,
    default: uuidv4,
    unique: true
  },
  topicTitle: String,
  completed: { type: Boolean, default: false },
  contents: [contentSchema],
}, { _id: false });

const moduleSchema = new mongoose.Schema({
  moduleTitle: String,
  description: String,
  completed: { type: Boolean, default: false },
  topics: [topicSchema],
}, { _id: false });

const finalTestSchema = new mongoose.Schema({
  name: String,
  type: { type: String, default: 'test' },
  completed: { type: Boolean, default: false },
  score: Number,
  questions: [questionSchema],
}, { _id: false });

const enrolledCourseSchema = new mongoose.Schema({
  courseId: { type: String, required: true }, 
  title: { type: String, required: true },
  image: String,
  previewVideo: String,
  duration: String,
  totalHours: { type: Number, default: 0 },
  watchedHours: { type: Number, default: 0 },
  badge: String,
  level: String,
  tags: [String],
  progress: { type: Boolean, default: false },
  progressPercent: { type: Number, default: 0 },
  isCompleted: { type: Boolean, default: false },
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
  modules: [moduleSchema],
  finalTest: finalTestSchema,
}, { _id: false });

const courseStudentSchema = new mongoose.Schema({
  enrolledCourses: [enrolledCourseSchema]
});

export default mongoose.model('CourseStudent', courseStudentSchema);
