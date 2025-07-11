import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Question Schema
const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [String],
  answer: { type: String, required: true },
  selectedAnswer: String,
  isCorrect: Boolean,
}, { _id: false });

// Content Schema
const contentSchema = new mongoose.Schema({
  type: { type: String, enum: ['video', 'pdf', 'image', 'audio', 'test'], required: true },
  name: String,
  duration: String,
  pages:String,
  url: String,
  completed: { type: Boolean, default: false },
  score: Number,
  questions: [questionSchema],
}, { _id: false });

// Topic Schema
const topicSchema = new mongoose.Schema({
  topicId: { type: String, default: uuidv4 },
  topicTitle: String,
  completed: { type: Boolean, default: false },
  contents: [contentSchema],
}, { _id: false });

// Module Schema
const moduleSchema = new mongoose.Schema({
  moduleTitle: String,
  description: String,
  completed: { type: Boolean, default: false },
  topics: [topicSchema],
}, { _id: false });

// Final Test Schema
const finalTestSchema = new mongoose.Schema({
  name: String,
  type: { type: String, default: 'test' },
  completed: { type: Boolean, default: false },
  score: Number,
  questions: [questionSchema],
}, { _id: false });

// Enrolled Course Schema
const enrolledCourseSchema = new mongoose.Schema({
  courseId: { type: String, required: true },
  title: String,
  image: String,
  previewVideo: String,
  duration: String,
  badge: String,
  level: String,
  tags: [String],

  totalHours: Number,
  watchedHours: { type: Number, default: 0 },

  progress: { type: Boolean, default: false },
  progressPercent: { type: Number, default: 0 },
  isCompleted: { type: Boolean, default: false },

  startedAt: { type: Date, default: Date.now },
  completedAt: Date,

  lastWatched: {
    moduleIndex: Number,
    topicIndex: Number,
    contentIndex: Number,
  },

  modules: [moduleSchema],
  finalTest: finalTestSchema,
}, { _id: false });


// Main Student Course Schema
const courseStudentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  enrolledCourses: [enrolledCourseSchema],

  // ✅ Global progress fields
  globalProgressPercent: { type: Number, default: 0 },
  globalProgressColor: {
    type: String,
    enum: ['red', 'yellow', 'green'],
    default: 'red',
  },
}, { timestamps: true });

// ✅ Global progress calculator
courseStudentSchema.methods.updateGlobalProgress = function () {
  const enrolled = this.enrolledCourses || [];

  const totalWatched = enrolled.reduce((acc, course) => acc + (course.watchedHours || 0), 0);
  const totalHours = enrolled.reduce((acc, course) => acc + (course.totalHours || 0), 0);

  let percent = totalHours ? Math.round((totalWatched / totalHours) * 100) : 0;

  let color = 'red';
  if (percent > 85) color = 'green';
  else if (percent > 60) color = 'yellow';

  this.globalProgressPercent = percent;
  this.globalProgressColor = color;
};

export default mongoose.model('CourseStudent', courseStudentSchema);
