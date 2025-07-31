import mongoose from "mongoose";
const attemptSchema = new mongoose.Schema(
  {
    score: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
    userAnswers: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);
const quizReportSchema = new mongoose.Schema(
  {
    quizName: { type: String, required: true },
    totalQuestions: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    incorrect: { type: Number, default: 0 },
    percent: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    lastScore: { type: Number, default: 0 },
    lastUserAnswers: { type: mongoose.Schema.Types.Mixed, default: {} },
    attempts: { type: [attemptSchema], default: [] },
  },
  { _id: false }
);
const testDataSchema = new mongoose.Schema(
  {
   userId: {
  type: String, 
  required: true
},
    courseId: {
      type: String,
      required: false,
    },
    certificates: {
      type: [String],
      default: [],
    },
    score: {
      type: Map,
      of: Number,
      default: {},
    },
    userAnswers: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    attemptCount: {
      type: Map,
      of: Number,
      default: {},
    },
    quizReports: {
      type: Map,
      of: quizReportSchema,
      default: {},
    },
    completedContent: {
      type: Map,
      of: Boolean,
      default: {},
    },
    activeModule: {
      type: String,
      default: null,
    },
    selectedTopic: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

testDataSchema.index({ userId: 1, courseId: 1 }, { unique: true });

const TestData = mongoose.model("TestData", testDataSchema);
export default TestData;
